import * as duckdb from '@duckdb/duckdb-wasm';
import type { ResultSet } from '../grading/types';
import type { DialectFilter } from '../content/dialects';
import { tableToResultSet } from './result-mapping';
import { toDuckDB } from './transpile';
import { buildChallenge, type DbtChallenge } from '../dbt/challenge';
import type { DbtRunner } from '../dbt/engine';

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

/**
 * Build a dbt challenge's model `files` and return its target model's rows. Runs
 * in an isolated `dbt_scratch` schema (dropped afterwards) so it never disturbs
 * the question datasets in the default schema. Used by the Model pillar (dbt).
 */
export async function buildDbtTarget(
  challenge: Pick<DbtChallenge, 'sources' | 'increment' | 'target'>,
  files: Record<string, string>,
): Promise<ResultSet> {
  return serialize(async () => {
    const conn = await getConn();
    await conn.query(`DROP SCHEMA IF EXISTS dbt_scratch CASCADE`);
    await conn.query(`CREATE SCHEMA dbt_scratch`);
    await conn.query(`USE dbt_scratch`);
    try {
      const runner: DbtRunner = {
        run: async (sql) => {
          await conn.query(sql);
        },
        tableExists: async (name) =>
          (
            await conn.query(
              `SELECT 1 FROM information_schema.tables WHERE table_schema = 'dbt_scratch' AND table_name = '${name}'`,
            )
          ).toArray().length > 0,
      };
      await buildChallenge(runner, challenge, files);
      return tableToResultSet(await conn.query(`SELECT * FROM ${challenge.target}`));
    } finally {
      await conn.query(`USE main`);
      await conn.query(`DROP SCHEMA IF EXISTS dbt_scratch CASCADE`);
    }
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
