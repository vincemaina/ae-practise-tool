import { describe, it, expect } from 'vitest';
import {
  compileModel,
  renderModel,
  topoSort,
  build,
  DbtError,
  type CompiledModel,
  type DbtRunner,
  type Model,
} from './engine';

const refRelation = (n: string) => n;
const sourceRelation = (s: string, t: string) => `${s}_${t}`;

function fakeRunner(existing: string[] = []) {
  const sql: string[] = [];
  const tables = new Set(existing);
  const runner: DbtRunner & { sql: string[] } = {
    sql,
    run: (s) => {
      sql.push(s.replace(/\s+/g, ' ').trim());
      return Promise.resolve();
    },
    tableExists: (n) => Promise.resolve(tables.has(n)),
  };
  return runner;
}

describe('compileModel', () => {
  it('extracts materialization + unique_key from config and strips it', () => {
    const c = compileModel({
      name: 'm',
      sql: "{{ config(materialized='incremental', unique_key='id') }}\nSELECT * FROM {{ ref('s') }}",
    });
    expect(c.materialized).toBe('incremental');
    expect(c.uniqueKey).toBe('id');
    expect(c.refs).toEqual(['s']);
    expect(c.body).not.toContain('config(');
  });

  it('defaults to a view when no config', () => {
    expect(compileModel({ name: 'm', sql: 'SELECT 1' }).materialized).toBe('view');
  });

  it('collects sources', () => {
    const c = compileModel({ name: 'm', sql: "SELECT * FROM {{ source('raw', 'orders') }}" });
    expect(c.sources).toEqual([['raw', 'orders']]);
  });

  it('rejects an unknown materialization', () => {
    expect(() => compileModel({ name: 'm', sql: "{{ config(materialized='wat') }} SELECT 1" })).toThrow(
      DbtError,
    );
  });

  it('accepts double-quoted config args identically to single-quoted (issue 0004)', () => {
    const c = compileModel({
      name: 'm',
      sql: '{{ config(materialized="incremental", unique_key="id") }}\nSELECT * FROM {{ ref("s") }}',
    });
    expect(c.materialized).toBe('incremental');
    expect(c.uniqueKey).toBe('id');
    expect(c.refs).toEqual(['s']);
    expect(c.body).not.toContain('config(');
  });

  it('accepts a double-quoted ref()', () => {
    const c = compileModel({ name: 'm', sql: 'SELECT * FROM {{ ref("stg_orders") }}' });
    expect(c.refs).toEqual(['stg_orders']);
  });

  it('accepts a double-quoted source() with two args', () => {
    const c = compileModel({ name: 'm', sql: 'SELECT * FROM {{ source("raw", "orders") }}' });
    expect(c.sources).toEqual([['raw', 'orders']]);
  });

  it('accepts source() with mixed quote styles across its two args', () => {
    const c = compileModel({ name: 'm', sql: `SELECT * FROM {{ source("raw", 'orders') }}` });
    expect(c.sources).toEqual([['raw', 'orders']]);
  });
});

describe('renderModel', () => {
  const c = compileModel({
    name: 'mart',
    sql: "SELECT * FROM {{ ref('stg') }} {% if is_incremental() %}WHERE ts > (SELECT MAX(ts) FROM {{ this }}){% endif %}",
  });

  it('resolves ref/this and drops the incremental block on a full build', () => {
    const sql = renderModel(c, { isIncremental: false, refRelation, sourceRelation });
    expect(sql).toBe('SELECT * FROM stg');
  });

  it('keeps the incremental block and resolves {{ this }} on an incremental build', () => {
    const sql = renderModel(c, { isIncremental: true, refRelation, sourceRelation });
    expect(sql).toContain('WHERE ts > (SELECT MAX(ts) FROM mart)');
  });

  it('resolves sources', () => {
    const s = compileModel({ name: 'stg', sql: "SELECT * FROM {{ source('raw','orders') }}" });
    expect(renderModel(s, { isIncremental: false, refRelation, sourceRelation })).toBe(
      'SELECT * FROM raw_orders',
    );
  });

  it('accepts is_incremental without parens (a common slip)', () => {
    const m = compileModel({
      name: 'mart',
      sql: "SELECT * FROM {{ ref('stg') }} {% if is_incremental %}WHERE ts > (SELECT MAX(ts) FROM {{ this }}){% endif %}",
    });
    expect(renderModel(m, { isIncremental: false, refRelation, sourceRelation })).toBe('SELECT * FROM stg');
    expect(renderModel(m, { isIncremental: true, refRelation, sourceRelation })).toContain(
      'WHERE ts > (SELECT MAX(ts) FROM mart)',
    );
  });

  it('throws a clear error on unresolved/unsupported Jinja instead of leaking it', () => {
    const bad = compileModel({ name: 'mart', sql: "SELECT * FROM {{ ref('stg') }} {% for x in y %}{% endfor %}" });
    expect(() => renderModel(bad, { isIncremental: false, refRelation, sourceRelation })).toThrow(
      /unsupported or malformed Jinja/,
    );
  });

  it('resolves a double-quoted ref() identically to single-quoted (issue 0004)', () => {
    const m = compileModel({ name: 'mart', sql: 'SELECT * FROM {{ ref("stg") }}' });
    expect(renderModel(m, { isIncremental: false, refRelation, sourceRelation })).toBe('SELECT * FROM stg');
  });

  it('resolves a double-quoted source() identically to single-quoted', () => {
    const s = compileModel({ name: 'stg', sql: 'SELECT * FROM {{ source("raw", "orders") }}' });
    expect(renderModel(s, { isIncremental: false, refRelation, sourceRelation })).toBe(
      'SELECT * FROM raw_orders',
    );
  });

  describe('{% if is_incremental() %} / {% else %}', () => {
    const withElse = compileModel({
      name: 'mart',
      sql: "SELECT * FROM {{ ref('stg') }} {% if is_incremental() %}WHERE ts > (SELECT MAX(ts) FROM {{ this }}){% else %}WHERE 1=1{% endif %}",
    });

    it('renders the if-branch on an incremental build', () => {
      const sql = renderModel(withElse, { isIncremental: true, refRelation, sourceRelation });
      expect(sql).toBe('SELECT * FROM stg WHERE ts > (SELECT MAX(ts) FROM mart)');
    });

    it('renders the else-branch on a full (non-incremental) build', () => {
      const sql = renderModel(withElse, { isIncremental: false, refRelation, sourceRelation });
      expect(sql).toBe('SELECT * FROM stg WHERE 1=1');
    });

    it('still drops the block entirely on a full build when there is no {% else %}', () => {
      const noElse = compileModel({
        name: 'mart',
        sql: "SELECT * FROM {{ ref('stg') }} {% if is_incremental() %}WHERE ts > (SELECT MAX(ts) FROM {{ this }}){% endif %}",
      });
      expect(renderModel(noElse, { isIncremental: false, refRelation, sourceRelation })).toBe(
        'SELECT * FROM stg',
      );
    });
  });
});

describe('topoSort', () => {
  const c = (name: string, refs: string[]): CompiledModel => ({
    name,
    materialized: 'view',
    refs,
    sources: [],
    body: '',
  });

  it('orders dependencies before dependents', () => {
    const order = topoSort([c('mart', ['stg']), c('stg', ['raw_view']), c('raw_view', [])]).map(
      (m) => m.name,
    );
    expect(order.indexOf('raw_view')).toBeLessThan(order.indexOf('stg'));
    expect(order.indexOf('stg')).toBeLessThan(order.indexOf('mart'));
  });

  it('throws on a cycle', () => {
    expect(() => topoSort([c('a', ['b']), c('b', ['a'])])).toThrow(DbtError);
  });
});

describe('build', () => {
  const proj: Model[] = [
    { name: 'stg', sql: "SELECT * FROM {{ source('raw','orders') }}" },
    {
      name: 'mart',
      sql: "{{ config(materialized='incremental', unique_key='id') }} SELECT * FROM {{ ref('stg') }} {% if is_incremental() %}WHERE ts > (SELECT MAX(ts) FROM {{ this }}){% endif %}",
    },
  ];

  it('builds in DAG order: view then incremental table (first run = full create)', async () => {
    const r = fakeRunner();
    const res = await build(r, proj);
    expect(res.order).toEqual(['stg', 'mart']);
    expect(r.sql[0]).toContain('CREATE OR REPLACE VIEW stg');
    expect(r.sql[1]).toBe('CREATE OR REPLACE TABLE mart AS SELECT * FROM stg');
  });

  it('upserts on unique_key when the incremental table already exists', async () => {
    const r = fakeRunner(['mart']); // mart exists → incremental run
    await build(r, proj);
    const inc = r.sql.filter((s) => s.includes('mart') || s.includes('__dbt_inc'));
    expect(inc.some((s) => s.startsWith('CREATE OR REPLACE TEMP TABLE __dbt_inc'))).toBe(true);
    expect(inc.some((s) => s.includes('DELETE FROM mart WHERE id IN'))).toBe(true);
    expect(inc.some((s) => s.includes('INSERT INTO mart SELECT * FROM __dbt_inc'))).toBe(true);
  });

  it('--full-refresh rebuilds an existing incremental model from scratch', async () => {
    const r = fakeRunner(['mart']);
    await build(r, proj, { fullRefresh: true });
    expect(r.sql.some((s) => s === 'CREATE OR REPLACE TABLE mart AS SELECT * FROM stg')).toBe(true);
    expect(r.sql.some((s) => s.includes('__dbt_inc'))).toBe(false);
  });

  it('inlines an ephemeral model as a CTE instead of building it', async () => {
    const withEph: Model[] = [
      { name: 'base', sql: "{{ config(materialized='ephemeral') }} SELECT * FROM {{ source('raw','o') }}" },
      { name: 'mart', sql: "{{ config(materialized='table') }} SELECT * FROM {{ ref('base') }}" },
    ];
    const r = fakeRunner();
    const res = await build(r, withEph);
    expect(res.order).toEqual(['mart']); // base is not built
    expect(r.sql).toHaveLength(1);
    expect(r.sql[0]).toBe(
      'CREATE OR REPLACE TABLE mart AS WITH __cte__base AS (SELECT * FROM raw_o) SELECT * FROM __cte__base',
    );
  });

  it('throws on a ref to an unknown model', async () => {
    await expect(build(fakeRunner(), [{ name: 'm', sql: "SELECT * FROM {{ ref('nope') }}" }])).rejects.toThrow(
      DbtError,
    );
  });

  it('builds a double-quoted config() as incremental instead of silently defaulting to view (issue 0004)', async () => {
    const doubleQuotedProj: Model[] = [
      { name: 'stg', sql: 'SELECT * FROM {{ source("raw", "orders") }}' },
      {
        name: 'mart',
        sql: '{{ config(materialized="incremental", unique_key="id") }} SELECT * FROM {{ ref("stg") }}',
      },
    ];
    const r = fakeRunner();
    const res = await build(r, doubleQuotedProj);
    expect(res.order).toEqual(['stg', 'mart']);
    // Previously: unmatched single-quote extraction silently defaulted to a view.
    expect(r.sql[1]).toBe('CREATE OR REPLACE TABLE mart AS SELECT * FROM stg');

    // And on a second run, against an existing table, it upserts like any other incremental model.
    const r2 = fakeRunner(['mart']);
    await build(r2, doubleQuotedProj);
    const inc = r2.sql.filter((s) => s.includes('mart') || s.includes('__dbt_inc'));
    expect(inc.some((s) => s.startsWith('CREATE OR REPLACE TEMP TABLE __dbt_inc'))).toBe(true);
    expect(inc.some((s) => s.includes('DELETE FROM mart WHERE id IN'))).toBe(true);
  });
});
