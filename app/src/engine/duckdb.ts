import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import type { ResultSet } from '../grading/types';
import { tableToResultSet } from './result-mapping';

// Manual bundles so Vite emits the worker + .wasm as assets (ADR 0001/0005).
// selectBundle prefers `eh` (exception-handling build) when supported, which
// avoids the cross-origin-isolation requirement of the threaded `coi` build.
const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
};

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
      const bundle = await duckdb.selectBundle(BUNDLES);
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
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
 *  (use CREATE OR REPLACE) so switching back and forth is safe. */
export async function ensureDataset(datasetId: string, setupSql: string): Promise<void> {
  return serialize(async () => {
    const conn = await getConn();
    if (loadedDataset !== datasetId) {
      await exec(conn, setupSql);
      loadedDataset = datasetId;
    }
  });
}

export async function runQuery(sql: string): Promise<ResultSet> {
  return serialize(async () => {
    const conn = await getConn();
    const table = await conn.query(sql);
    return tableToResultSet(table);
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
export async function validateSql(sql: string): Promise<SqlError | null> {
  if (!sql.trim()) return null;
  return serialize(async () => {
    const conn = await getConn();
    try {
      await conn.query(`EXPLAIN ${sql}`);
      return null;
    } catch (e) {
      const message = (e as Error)?.message ?? String(e);
      const match = /LINE (\d+)/.exec(message);
      return { message, line: match ? Number(match[1]) : undefined };
    }
  });
}
