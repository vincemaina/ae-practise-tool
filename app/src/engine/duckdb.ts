import * as duckdb from '@duckdb/duckdb-wasm';
import type { ResultSet } from '../grading/types';
import type { DialectFilter } from '../content/dialects';
import { tableToResultSet } from './result-mapping';
import { toDuckDB } from './transpile';
import { buildChallenge, filesToModels, type DbtChallenge } from '../dbt/challenge';
import type { DbtRunner } from '../dbt/engine';
import { runDbtCommand, type CommandResult } from '../dbt/commands';
import type { Cell } from '../grading/types';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
let connPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;
let loadedDataset: string | null = null;

// Serialize all access to the single connection so background validation (the
// editor linter) can never interleave with an explicit Run/Submit.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Load DuckDB's wasm + worker from jsDelivr rather than self-hosting them.
      // The wasm binaries (~33–38 MB) exceed static-host per-asset limits (e.g.
      // Cloudflare's 25 MiB cap), so we serve only the app shell and pull the
      // engine from the CDN; the service worker runtime-caches it (see
      // vite.config.ts) so offline still works after first load. This supersedes
      // ADR 0001's self-hosted bundles — see that ADR's 2026-07-10 update.
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      // The worker script is cross-origin (jsDelivr), so wrap it in a same-origin
      // blob that importScripts() it — the standard DuckDB-Wasm CDN pattern.
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' }),
      );
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(logger, new Worker(workerUrl));
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      return db;
    })();
  }
  return dbPromise;
}

async function getConn(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!connPromise) {
    connPromise = getDb().then((db) => db.connect());
  }
  return connPromise;
}

/** Run each `;`-separated statement in order (sufficient for our seed scripts). */
async function exec(conn: duckdb.AsyncDuckDBConnection, sql: string): Promise<void> {
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
    await conn.query(stmt);
  }
}

/** Seed the dataset if it isn't already loaded. Setup SQL must be idempotent
 *  (use CREATE OR REPLACE) so switching back and forth is safe. `messinessSql`
 *  (per-question, applied after setup) dirties the data; `variant` keys the load
 *  cache so switching between a clean and a messy question on the same dataset
 *  re-seeds correctly. */
export async function ensureDataset(
  datasetId: string,
  setupSql: string,
  opts?: { messinessSql?: string[]; variant?: string },
): Promise<void> {
  return serialize(async () => {
    const conn = await getConn();
    const key = opts?.variant ? `${datasetId}#${opts.variant}` : datasetId;
    if (loadedDataset !== key) {
      await exec(conn, setupSql);
      for (const stmt of opts?.messinessSql ?? []) await conn.query(stmt);
      loadedDataset = key;
    }
  });
}

/** Run a query. `dialect` (default 'all' = no translation) transpiles the user's
 *  SQL from their dialect to DuckDB first (ADR 0006). Transpile happens outside
 *  the connection queue since it doesn't touch the DB. */
export async function runQuery(sql: string, dialect: DialectFilter = 'all'): Promise<ResultSet> {
  const duckSql = await toDuckDB(sql, dialect);
  return serialize(async () => {
    const conn = await getConn();
    const table = await conn.query(duckSql);
    return tableToResultSet(table);
  });
}

const dbtStatements = (sql: string) =>
  sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

/** A `DbtRunner` bound to a specific schema (so builds land there, and
 *  `tableExists` — which drives the incremental path — checks that schema). */
function schemaRunner(conn: duckdb.AsyncDuckDBConnection, schema: string): DbtRunner {
  return {
    run: async (sql) => {
      await conn.query(sql);
    },
    tableExists: async (name) =>
      (
        await conn.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${name}'`,
        )
      ).toArray().length > 0,
  };
}

/**
 * Build a dbt challenge's model `files` and return its target model's rows. Runs
 * in an isolated, single-use `dbt_grade` schema (dropped afterwards) so grading
 * never disturbs the question datasets *or* the terminal's persistent scratch
 * (below). Used by the Model pillar's Submit. Always a full build.
 */
export async function buildDbtTarget(
  challenge: Pick<DbtChallenge, 'sources' | 'increment' | 'target'>,
  files: Record<string, string>,
): Promise<ResultSet> {
  return serialize(async () => {
    const conn = await getConn();
    await conn.query(`DROP SCHEMA IF EXISTS dbt_grade CASCADE`);
    await conn.query(`CREATE SCHEMA dbt_grade`);
    await conn.query(`USE dbt_grade`);
    try {
      await buildChallenge(schemaRunner(conn, 'dbt_grade'), challenge, files);
      return tableToResultSet(await conn.query(`SELECT * FROM ${challenge.target}`));
    } finally {
      await conn.query(`USE main`);
      await conn.query(`DROP SCHEMA IF EXISTS dbt_grade CASCADE`);
    }
  });
}

export interface SourceTable {
  name: string;
  columns: { name: string; type: string }[];
  rows: Cell[][];
}

/** (Re)seed the terminal's **persistent** `dbt_scratch` schema from a challenge's
 *  sources and return each raw table's columns + sample rows (for Instructions).
 *  Called once when a challenge's workspace mounts. The schema then survives
 *  across `dbt run`/`build` invocations so incremental models actually persist
 *  and rebuild incrementally the second time around. */
export async function dbtInit(sourcesSql: string): Promise<SourceTable[]> {
  return serialize(async () => {
    const conn = await getConn();
    await conn.query(`DROP SCHEMA IF EXISTS dbt_scratch CASCADE`);
    await conn.query(`CREATE SCHEMA dbt_scratch`);
    await conn.query(`USE dbt_scratch`);
    try {
      for (const stmt of dbtStatements(sourcesSql)) await conn.query(stmt);
      const names = (
        await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'dbt_scratch'`)
      )
        .toArray()
        .map((r) => String((r as { table_name: string }).table_name));
      const out: SourceTable[] = [];
      for (const name of names) {
        const described = (await conn.query(`DESCRIBE ${name}`)).toArray() as {
          column_name: string;
          column_type: string;
        }[];
        const typeByName = new Map(described.map((d) => [d.column_name, d.column_type]));
        const sample = tableToResultSet(await conn.query(`SELECT * FROM ${name} LIMIT 4`));
        out.push({
          name,
          columns: sample.columns.map((c) => ({ name: c.name, type: typeByName.get(c.name) ?? '' })),
          rows: sample.rows,
        });
      }
      return out;
    } finally {
      await conn.query(`USE main`);
    }
  });
}

/** Run a `dbt <command>` against the **persistent** `dbt_scratch` schema.
 *  `dbt compile` (and unknown `dbt` subcommands) render without touching the DB;
 *  `dbt run`/`build` materialize the user's models *without* resetting scratch
 *  (so incremental models persist between runs). SQL queries go through
 *  `dbtQuery` (the SQL console), not here — the terminal is dbt-only. */
export async function dbtRunCommand(
  command: string,
  files: Record<string, string>,
): Promise<CommandResult> {
  const models = filesToModels(command.trim() === '' ? {} : files);
  const sub = command.trim().split(/\s+/)[1];
  // Only run/build touch the warehouse; compile + unknown commands stay DB-free.
  if (sub !== 'run' && sub !== 'build') {
    const noop: DbtRunner = { run: async () => {}, tableExists: async () => false };
    return runDbtCommand(noop, async () => 0, command, models);
  }
  return serialize(async () => {
    const conn = await getConn();
    await conn.query(`USE dbt_scratch`);
    try {
      const runner = schemaRunner(conn, 'dbt_scratch');
      const rowCount = async (name: string) =>
        Number((await conn.query(`SELECT COUNT(*) c FROM ${name}`)).toArray()[0]!.c);
      return await runDbtCommand(runner, rowCount, command, models);
    } finally {
      await conn.query(`USE main`);
    }
  });
}

/** Run arbitrary SQL against the persistent `dbt_scratch` schema (the Model
 *  pillar's SQL console) so users can inspect their materialized models and the
 *  seeded sources, e.g. `select * from orders_mart`. */
export async function dbtQuery(sql: string): Promise<ResultSet> {
  return serialize(async () => {
    const conn = await getConn();
    await conn.query(`USE dbt_scratch`);
    try {
      return tableToResultSet(await conn.query(sql));
    } finally {
      await conn.query(`USE main`);
    }
  });
}

export interface WarehouseObject {
  name: string;
  /** `table`/`view` = materialized by dbt; `source` = seeded raw input. */
  kind: 'table' | 'view' | 'source';
}

/** List what physically exists in the persistent `dbt_scratch` warehouse — the
 *  seeded sources plus any views/tables `dbt build` has materialized. `sources`
 *  are the seeded raw-table names (so they're labelled distinctly from models). */
export async function listWarehouseObjects(sources: string[]): Promise<WarehouseObject[]> {
  const srcSet = new Set(sources);
  return serialize(async () => {
    const conn = await getConn();
    const rows = (
      await conn.query(
        `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'dbt_scratch' ORDER BY table_name`,
      )
    ).toArray() as { table_name: string; table_type: string }[];
    return rows.map((r) => ({
      name: String(r.table_name),
      kind: srcSet.has(String(r.table_name))
        ? ('source' as const)
        : /VIEW/i.test(r.table_type)
          ? ('view' as const)
          : ('table' as const),
    }));
  });
}

export interface SqlError {
  message: string;
  /** 1-based line number parsed from the engine error, if present. */
  line?: number;
}

/** Validate a query without surfacing results, for inline error highlighting.
 *  Uses EXPLAIN so it catches parser AND binder errors (unknown columns, etc.)
 *  against the currently-seeded dataset. Returns null when the query is valid. */
export async function validateSql(
  sql: string,
  dialect: DialectFilter = 'all',
): Promise<SqlError | null> {
  if (!sql.trim()) return null;
  let duckSql: string;
  try {
    duckSql = await toDuckDB(sql, dialect);
  } catch (e) {
    // Transpile/parse failure — surface it as the inline error.
    return { message: (e as Error).message, line: (e as { errorLine?: number }).errorLine };
  }
  return serialize(async () => {
    const conn = await getConn();
    try {
      await conn.query(`EXPLAIN ${duckSql}`);
      return null;
    } catch (e) {
      const message = (e as Error)?.message ?? String(e);
      const match = /LINE (\d+)/.exec(message);
      return { message, line: match ? Number(match[1]) : undefined };
    }
  });
}
