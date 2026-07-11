/**
 * SPIKE — does a TS "mini-dbt" work against DuckDB-Wasm? (ROADMAP: dbt engine.)
 * Proves the risky core end-to-end: resolve {{ ref() }}/{{ source() }}/{{ config() }}/
 * {{ this }} + {% if is_incremental() %}, build a DAG in dependency order, materialize
 * view + incremental models, and — the real test — **upsert on a second build** so an
 * incremental model matches a full rebuild. Run: pnpm tsx scripts/dbt-spike.ts
 */
import { createRequire } from 'node:module';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';

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

// ── mini-dbt engine ────────────────────────────────────────────────
type Materialization = 'view' | 'table' | 'incremental';
interface Model {
  name: string;
  sql: string; // raw, with Jinja
}
interface Compiled {
  name: string;
  materialized: Materialization;
  uniqueKey?: string;
  refs: string[];
  body: string; // SQL with config stripped, refs/sources/this still as templates
}

const rx = {
  config: /\{\{\s*config\(([\s\S]*?)\)\s*\}\}/,
  ref: /\{\{\s*ref\(\s*'([^']+)'\s*\)\s*\}\}/g,
  source: /\{\{\s*source\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)\s*\}\}/g,
  self: /\{\{\s*this\s*\}\}/g,
  incr: /\{%\s*if\s+is_incremental\(\)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
};

/** source('raw','orders') → the seeded relation name. */
const sourceRelation = (schema: string, table: string) => `${schema}_${table}`;

function compile(m: Model): Compiled {
  const cfgMatch = rx.config.exec(m.sql);
  const cfg = cfgMatch?.[1] ?? '';
  const materialized = (/materialized\s*=\s*'([^']+)'/.exec(cfg)?.[1] ?? 'view') as Materialization;
  const uniqueKey = /unique_key\s*=\s*'([^']+)'/.exec(cfg)?.[1];
  const body = m.sql.replace(rx.config, '').trim();
  const refs = [...body.matchAll(rx.ref)].map((r) => r[1]!);
  return { name: m.name, materialized, uniqueKey, refs, body };
}

/** Render a compiled model's SQL, resolving refs/sources/this and the incremental block. */
function render(c: Compiled, isIncremental: boolean): string {
  return c.body
    .replace(rx.incr, (_all, inner) => (isIncremental ? inner : ''))
    .replace(rx.ref, (_all, name) => name)
    .replace(rx.source, (_all, s, t) => sourceRelation(s, t))
    .replace(rx.self, () => c.name)
    .trim();
}

/** Topological sort by ref() edges (ignores refs to non-models, e.g. sources). */
function toposort(models: Compiled[]): Compiled[] {
  const byName = new Map(models.map((m) => [m.name, m]));
  const seen = new Set<string>();
  const out: Compiled[] = [];
  const visit = (m: Compiled) => {
    if (seen.has(m.name)) return;
    seen.add(m.name);
    for (const r of m.refs) if (byName.has(r)) visit(byName.get(r)!);
    out.push(m);
  };
  models.forEach(visit);
  return out;
}

interface BuildResult {
  order: string[];
  compiledSql: Record<string, string>;
}

function build(
  conn: duckdb.DuckDBConnection,
  models: Model[],
  existing: Set<string>,
  fullRefresh = false,
): BuildResult {
  const compiled = models.map(compile);
  const ordered = toposort(compiled);
  const compiledSql: Record<string, string> = {};

  for (const c of ordered) {
    const isIncremental = c.materialized === 'incremental' && existing.has(c.name) && !fullRefresh;
    const sql = render(c, isIncremental);
    compiledSql[c.name] = sql;

    if (c.materialized === 'view') {
      conn.query(`CREATE OR REPLACE VIEW ${c.name} AS ${sql}`);
    } else if (c.materialized === 'table') {
      conn.query(`CREATE OR REPLACE TABLE ${c.name} AS ${sql}`);
    } else {
      // incremental
      if (!isIncremental) {
        conn.query(`CREATE OR REPLACE TABLE ${c.name} AS ${sql}`);
      } else {
        // delete+insert upsert on unique_key (dbt's DuckDB default strategy)
        conn.query(`CREATE OR REPLACE TEMP TABLE __dbt_inc AS ${sql}`);
        conn.query(
          `DELETE FROM ${c.name} WHERE ${c.uniqueKey} IN (SELECT ${c.uniqueKey} FROM __dbt_inc)`,
        );
        conn.query(`INSERT INTO ${c.name} SELECT * FROM __dbt_inc`);
        conn.query(`DROP TABLE __dbt_inc`);
      }
      existing.add(c.name);
    }
  }
  return { order: ordered.map((c) => c.name), compiledSql };
}

// ── the spike project + scenario ───────────────────────────────────
const MODELS: Model[] = [
  {
    name: 'stg_orders',
    sql: `SELECT order_id, customer_id, amount, updated_at FROM {{ source('raw', 'orders') }}`,
  },
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
const rows = (sql: string) => conn.query(sql).toArray().map((r) => JSON.stringify(r));
const count = (t: string) => Number((conn.query(`SELECT COUNT(*) c FROM ${t}`).toArray()[0] as { c: bigint }).c);

// Seed the raw source.
conn.query(`CREATE TABLE raw_orders (order_id INT, customer_id INT, amount DECIMAL(10,2), updated_at TIMESTAMP)`);
conn.query(`INSERT INTO raw_orders VALUES
  (1, 10, 50.00, TIMESTAMP '2026-01-01 09:00'),
  (2, 11, 30.00, TIMESTAMP '2026-01-01 10:00'),
  (3, 10, 20.00, TIMESTAMP '2026-01-02 08:00')`);

const existing = new Set<string>();
const r1 = build(conn, MODELS, existing);
console.log('build #1 order:', r1.order.join(' → '));
console.log('  orders_mart rows:', count('orders_mart'), '(expect 3)');

// Now the source changes: 2 brand-new orders + 1 update to order 1 (later updated_at, new amount).
conn.query(`INSERT INTO raw_orders VALUES
  (4, 12, 99.00, TIMESTAMP '2026-01-03 09:00'),
  (5, 11, 15.00, TIMESTAMP '2026-01-03 10:00'),
  (1, 10, 55.00, TIMESTAMP '2026-01-03 11:00')`); // order 1 restated

const r2 = build(conn, MODELS, existing); // incremental run
console.log('build #2 (incremental) — orders_mart rows:', count('orders_mart'), '(expect 5, order 1 upserted)');
console.log('  order 1 now:', rows(`SELECT order_id, amount FROM orders_mart WHERE order_id = 1`).join(''));

// Correctness: incremental result must equal a full rebuild of the same logic.
conn.query(`CREATE TABLE full_rebuild AS
  SELECT order_id, ANY_VALUE(customer_id) customer_id, ARG_MAX(amount, updated_at) amount, MAX(updated_at) updated_at
  FROM raw_orders GROUP BY order_id`);
const incremental = rows(`SELECT order_id, amount FROM orders_mart ORDER BY order_id`);
const rebuild = rows(`SELECT order_id, amount FROM full_rebuild ORDER BY order_id`);
const match = JSON.stringify(incremental) === JSON.stringify(rebuild);
console.log(`\nincremental == full rebuild: ${match ? '✅ YES' : '❌ NO'}`);
console.log('  incremental:', incremental.join(' '));
console.log('  rebuild:    ', rebuild.join(' '));
console.log('\ncompiled orders_mart (incremental run):\n' + r2.compiledSql['orders_mart']);
