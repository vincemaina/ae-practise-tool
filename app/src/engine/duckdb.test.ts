import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These tests exercise `duckdb.ts`'s module-level caching (dbPromise/connPromise/
// loadedDataset) directly, so every test re-imports the module fresh via
// `vi.resetModules()` — otherwise state would leak between tests. The real
// `@duckdb/duckdb-wasm` (native wasm + worker) is mocked out entirely; only the
// shape our code depends on is provided.

// `new Worker(...)` is a browser API `duckdb.ts` calls directly (not through the
// mocked module) — Node has no global Worker, so stub it.
class FakeWorker {}

/** A tiny fake Arrow-like table `conn.query` can resolve with. */
function fakeTable(rows: Record<string, unknown>[] = []) {
  const fields = rows.length ? Object.keys(rows[0]!).map((name) => ({ name, type: 'Utf8' })) : [];
  return { schema: { fields }, toArray: () => rows };
}

type FakeBundle = { mainWorker: string; mainModule: string; pthreadWorker: undefined };
type FakeConn = { query: (sql: string) => Promise<ReturnType<typeof fakeTable>> };

let selectBundle: ReturnType<typeof vi.fn<() => Promise<FakeBundle>>>;
let connect: ReturnType<typeof vi.fn<() => Promise<FakeConn>>>;
let query: ReturnType<typeof vi.fn<(sql: string) => Promise<ReturnType<typeof fakeTable>>>>;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('Worker', FakeWorker);

  selectBundle = vi.fn(async () => ({ mainWorker: 'worker.js', mainModule: 'main.wasm', pthreadWorker: undefined }));
  query = vi.fn(async () => fakeTable());
  connect = vi.fn(async () => ({ query }));

  vi.doMock('@duckdb/duckdb-wasm', () => ({
    selectBundle: () => selectBundle(),
    getJsDelivrBundles: vi.fn(() => ({})),
    ConsoleLogger: class {},
    LogLevel: { WARNING: 0 },
    AsyncDuckDB: class {
      async instantiate() {}
      connect() {
        return connect();
      }
    },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('@duckdb/duckdb-wasm');
});

describe('engine boot retry (issue 0002)', () => {
  it('retries after the DuckDB bundle fetch rejects once, instead of staying broken', async () => {
    selectBundle.mockRejectedValueOnce(new Error('jsDelivr blip'));

    const { ensureDataset } = await import('./duckdb');

    await expect(ensureDataset('ds', 'CREATE TABLE t (x INT)')).rejects.toThrow('jsDelivr blip');
    // The connection was never established for the failed attempt.
    expect(connect).not.toHaveBeenCalled();

    // The connection recovers on retry — same call, no reload/remount involved.
    await expect(ensureDataset('ds', 'CREATE TABLE t (x INT)')).resolves.toBeUndefined();
    expect(selectBundle).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries after `connect()` rejects once, even if the wasm bundle loaded fine', async () => {
    connect.mockRejectedValueOnce(new Error('connect blip'));

    const { runQuery } = await import('./duckdb');

    await expect(runQuery('SELECT 1')).rejects.toThrow('connect blip');
    await expect(runQuery('SELECT 1')).resolves.toEqual({ columns: [], rows: [] });
    // The bundle only needs to load once — getDb() itself succeeded the first time.
    expect(selectBundle).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('happy path still boots once and stays lazy (no change to normal behaviour)', async () => {
    const { ensureDataset, runQuery } = await import('./duckdb');

    await ensureDataset('ds', 'CREATE TABLE t (x INT)');
    await runQuery('SELECT 1');
    await runQuery('SELECT 2');

    expect(selectBundle).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});

describe('dataset mutation invalidates the load cache (issue 0001)', () => {
  it('re-seeds on the next ensureDataset call after a mutating query ran', async () => {
    const { ensureDataset, runQuery } = await import('./duckdb');

    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)');
    expect(query).toHaveBeenCalledTimes(1); // the setup statement

    // A plain read doesn't dirty the cache.
    await runQuery('SELECT * FROM orders');
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)');
    expect(query).toHaveBeenCalledTimes(2); // +1 for the SELECT, no re-seed

    // A mutating statement (DELETE/UPDATE/DROP/…) dirties it.
    await runQuery('DELETE FROM orders');
    expect(query).toHaveBeenCalledTimes(3);
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)');
    // The cache key is unchanged, but the mutation should have forced a re-seed.
    expect(query).toHaveBeenCalledTimes(4); // the setup statement re-ran
  });

  it('treats WITH/SELECT as read-only and does not force a re-seed', async () => {
    const { ensureDataset, runQuery } = await import('./duckdb');
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)');
    query.mockClear();

    await runQuery('WITH x AS (SELECT 1) SELECT * FROM x');
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)');
    expect(query).toHaveBeenCalledTimes(1); // only the WITH/SELECT — no re-seed
  });

  it('still keys the cache by variant so a messiness switch re-seeds as before', async () => {
    const { ensureDataset } = await import('./duckdb');
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)', { variant: 'clean' });
    query.mockClear();
    await ensureDataset('ecommerce', 'CREATE OR REPLACE TABLE orders (id INT)', { variant: 'messy' });
    expect(query).toHaveBeenCalledTimes(1); // re-seeded for the new variant key
  });
});
