import { describe, it, expect } from 'vitest';
import { runDbtCommand } from './commands';
import type { DbtRunner, Model } from './engine';

const runner: DbtRunner = { run: () => Promise.resolve(), tableExists: () => Promise.resolve(false) };
const rowCount = () => Promise.resolve(3);
const models: Model[] = [
  { name: 'stg', sql: "select * from {{ source('raw','o') }}" },
  { name: 'mart', sql: "{{ config(materialized='table') }} select * from {{ ref('stg') }}" },
];

describe('runDbtCommand', () => {
  it('compile renders models without touching the DB', async () => {
    const r = await runDbtCommand(runner, rowCount, 'dbt compile', models);
    expect(r.ok).toBe(true);
    expect(r.lines.join('\n')).toContain('Compiled 2 models');
    expect(r.lines.join('\n')).toContain('from raw_o'); // source resolved
  });

  it('build reports per-model OK with row counts, in DAG order', async () => {
    const r = await runDbtCommand(runner, rowCount, 'dbt build', models);
    expect(r.ok).toBe(true);
    const text = r.lines.join('\n');
    expect(text).toContain('OK stg [3 rows]');
    expect(text).toContain('OK mart [3 rows]');
    expect(text.indexOf('stg')).toBeLessThan(text.indexOf('mart'));
  });

  it('reports a build error and marks not-ok', async () => {
    const r = await runDbtCommand(runner, rowCount, 'dbt run', [
      { name: 'bad', sql: "select * from {{ ref('missing') }}" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.lines.join('\n')).toContain('ERROR');
  });

  it('--select builds only the model and its upstream deps', async () => {
    const r = await runDbtCommand(runner, rowCount, 'dbt build -s mart', models);
    expect(r.ok).toBe(true);
    const text = r.lines.join('\n');
    expect(text).toContain("selected 'mart'");
    expect(text).toContain('OK stg'); // ancestor included so ref resolves
    expect(text).toContain('OK mart');
  });

  it('--select a leaf builds just that model (skips unrelated stubs)', async () => {
    const withStub = [...models, { name: 'wip', sql: '-- not written yet' }];
    const r = await runDbtCommand(runner, rowCount, 'dbt build --select stg', withStub);
    expect(r.ok).toBe(true);
    expect(r.lines.join('\n')).toContain('OK stg');
    expect(r.lines.join('\n')).not.toContain('wip');
  });

  it('--select of an unknown model errors', async () => {
    const r = await runDbtCommand(runner, rowCount, 'dbt build -s nope', models);
    expect(r.ok).toBe(false);
    expect(r.lines.join('\n')).toContain("model 'nope' not found");
  });

  it('rejects unknown + non-dbt commands', async () => {
    expect((await runDbtCommand(runner, rowCount, 'dbt frobnicate', models)).ok).toBe(false);
    expect((await runDbtCommand(runner, rowCount, 'ls -la', models)).ok).toBe(false);
  });
});
