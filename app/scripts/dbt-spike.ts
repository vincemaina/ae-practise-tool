/**
 * Integration check for the mini-dbt engine (`src/dbt/engine.ts`) against a REAL
 * DuckDB. Complements the DB-free unit tests: builds a 2-model project (staging
 * view → incremental mart), then rebuilds after the source changes and asserts the
 * incremental result equals a full rebuild — the real incremental-correctness test.
 * Run: pnpm tsx scripts/dbt-spike.ts
 */
import { createRequire } from 'node:module';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';
import { build, type DbtRunner, type Model } from '../src/dbt/engine';

const require = createRequire(import.meta.url);
const BUNDLES = {
  mvp: {
    mainModule: require.resolve('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm'),
    mainWorker: require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-mvp.worker.cjs'),
  },
  eh: {
    mainModule: require.resolve('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'),
    mainWorker: require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-eh.worker.cjs'),
  },
};

const MODELS: Model[] = [
  { name: 'stg_orders', sql: `SELECT order_id, customer_id, amount, updated_at FROM {{ source('raw', 'orders') }}` },
  {
    name: 'orders_mart',
    sql: `
      {{ config(materialized='incremental', unique_key='order_id') }}
      SELECT order_id, customer_id, amount, updated_at
      FROM {{ ref('stg_orders') }}
      {% if is_incremental() %}
      WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
      {% endif %}
    `,
  },
];

const db = await duckdb.createDuckDB(BUNDLES, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
await db.instantiate(() => {});
const conn = db.connect();

const runner: DbtRunner = {
  run: (sql) => {
    conn.query(sql);
    return Promise.resolve();
  },
  tableExists: (name) =>
    Promise.resolve(
      conn.query(`SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`).toArray().length > 0,
    ),
};

const rows = (sql: string) => conn.query(sql).toArray().map((r) => JSON.stringify(r));
const count = (t: string) => Number((conn.query(`SELECT COUNT(*) c FROM ${t}`).toArray()[0] as { c: bigint }).c);

conn.query(`CREATE TABLE raw_orders (order_id INT, customer_id INT, amount DECIMAL(10,2), updated_at TIMESTAMP)`);
conn.query(`INSERT INTO raw_orders VALUES
  (1, 10, 50.00, TIMESTAMP '2026-01-01 09:00'),
  (2, 11, 30.00, TIMESTAMP '2026-01-01 10:00'),
  (3, 10, 20.00, TIMESTAMP '2026-01-02 08:00')`);

const r1 = await build(runner, MODELS);
console.log('build #1 order:', r1.order.join(' → '), '| orders_mart rows:', count('orders_mart'), '(expect 3)');

conn.query(`INSERT INTO raw_orders VALUES
  (4, 12, 99.00, TIMESTAMP '2026-01-03 09:00'),
  (5, 11, 15.00, TIMESTAMP '2026-01-03 10:00'),
  (1, 10, 55.00, TIMESTAMP '2026-01-03 11:00')`); // order 1 restated

await build(runner, MODELS); // incremental
console.log('build #2 (incremental) — orders_mart rows:', count('orders_mart'), '(expect 5, order 1 upserted)');

conn.query(`CREATE TABLE full_rebuild AS
  SELECT order_id, ARG_MAX(amount, updated_at) amount FROM raw_orders GROUP BY order_id`);
const incremental = rows(`SELECT order_id, amount FROM orders_mart ORDER BY order_id`);
const rebuild = rows(`SELECT order_id, amount FROM full_rebuild ORDER BY order_id`);
console.log(`\nincremental == full rebuild: ${JSON.stringify(incremental) === JSON.stringify(rebuild) ? '✅ YES' : '❌ NO'}`);
