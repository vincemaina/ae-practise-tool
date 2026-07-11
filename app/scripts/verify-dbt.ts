/**
 * Content check for dbt challenges (phase 2 analog of verify:content). For each
 * challenge, builds the reference solution against a REAL DuckDB via the mini-dbt
 * engine and asserts: the target model has rows, and the solution self-grades as
 * Correct (a determinism check — two independent builds must match). This is the
 * authoring safety net that lets dbt challenges be validated headlessly + in CI.
 * Run: pnpm tsx scripts/verify-dbt.ts
 */
import { createRequire } from 'node:module';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';
import { challenges } from '../src/dbt/node';
import { buildChallenge, type DbtChallenge } from '../src/dbt/challenge';
import type { DbtRunner } from '../src/dbt/engine';
import { checkStructure } from '../src/dbt/grade';
import { grade } from '../src/grading/grade';
import { tableToResultSet } from '../src/engine/result-mapping';
import type { ResultSet } from '../src/grading/types';

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

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
}

/** Build `files` for a challenge in a fresh database and return the target rows. */
async function buildTarget(
  challenge: DbtChallenge,
  files: Record<string, string>,
): Promise<ResultSet> {
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
        conn.query(`SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`).toArray()
          .length > 0,
      ),
  };
  await buildChallenge(runner, challenge, files);
  return tableToResultSet(conn.query(`SELECT * FROM ${challenge.target}`));
}

for (const ch of challenges) {
  console.log(`\n${ch.id} — ${ch.title}`);
  try {
    const expected = await buildTarget(ch, ch.solution);
    const rebuilt = await buildTarget(ch, ch.solution);
    check(`solution self-grades as Correct (deterministic)`, grade(expected, rebuilt, ch.grading).correct);
    check(`target '${ch.target}' returns at least one row`, expected.rows.length > 0);
    check(`starter files exist for every solution file`, Object.keys(ch.solution).every((f) => f in ch.starter));
    // The reference solution must satisfy its own structural checks.
    const structural = checkStructure(ch.solution, ch.checks ?? []);
    check(`solution passes its structural checks`, structural.length === 0, structural.join('; '));
  } catch (e) {
    check('builds without error', false, String(e).split('\n')[0]);
  }
}

console.log(failures === 0 ? '\nALL DBT CHALLENGE CHECKS PASSED ✓' : `\n${failures} check(s) failed ✗`);
process.exit(failures === 0 ? 0 : 1);
