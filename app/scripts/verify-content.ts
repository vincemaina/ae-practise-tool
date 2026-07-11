/**
 * Content verification — boots the REAL DuckDB-Wasm engine in Node (the
 * node-blocking build) and checks every question against its dataset using the
 * app's actual result-mapping + grading code. This is our stand-in for an
 * in-browser e2e run and the seed of the ADR 0003 authoring/validation test:
 * every canonical solution must execute and grade itself as Correct.
 *
 * Run: pnpm verify:content
 */
import { createRequire } from 'node:module';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs';
import * as poly from '@polyglot-sql/sdk';
import { tableToResultSet } from '../src/engine/result-mapping';
import { fixupDuckDbSql } from '../src/engine/transpile';
import { buildMessinessSql } from '../src/content/messiness';
import { grade } from '../src/grading/grade';
import { questions, getDataset, paths } from '../src/content/node';
import { extractMetrics } from '../src/content/metrics';
import { questionMetadata } from '../src/content/question-metadata.generated';
import type { Dialect } from '../src/content/types';

// Our dialects → polyglot read-dialect names (mirrors engine/transpile.ts).
const POLY: Partial<Record<Dialect, string>> = {
  snowflake: 'snowflake',
  bigquery: 'bigquery',
  postgres: 'postgres',
  mysql: 'mysql',
  sqlserver: 'tsql',
};
await poly.init();

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

const db = await duckdb.createDuckDB(BUNDLES, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
await db.instantiate(() => {});
const conn = db.connect();

const exec = (sql: string) =>
  sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => conn.query(s));
const runQuery = (sql: string) => tableToResultSet(conn.query(sql));
const astOf = (sql: string) =>
  (conn.query(`SELECT json_serialize_sql('${sql.replace(/'/g, "''")}') AS ast`).toArray()[0] as {
    ast: string;
  }).ast;

for (const q of questions) {
  console.log(`\n${q.id} — ${q.title}`);
  const dataset = getDataset(q.datasetId);
  exec(dataset.setupSql);
  // Apply the same per-question mess the app does, so the canonical is checked
  // against the messy data the user will actually see (ADR 0003 + messiness.ts).
  if (q.messiness) for (const s of buildMessinessSql(q.messiness)) conn.query(s);

  const canonical = (q.canonical.generic ?? '').trim();
  if (!canonical) {
    check('has a generic canonical solution', false, 'missing');
    continue;
  }

  check('has at least one dialect tag', q.dialects.length > 0);

  // Canonical must run and grade itself as Correct — this doubles as a
  // determinism check (a second run is graded against the first under the
  // question's own grading rules).
  const expected = runQuery(canonical);
  const self = grade(expected, runQuery(canonical), q.grading);
  check('canonical grades as Correct (deterministic)', self.correct, self.reasons.join('; '));
  check('canonical returns at least one row', expected.rows.length > 0);

  // Decimals must be real numbers, not unscaled integer strings.
  const hasMoney = expected.columns.some((c) => /total|amount|revenue/i.test(c.name));
  if (hasMoney) {
    const numeric = expected.rows.every((r) => r.every((c) => typeof c !== 'string' || isNaN(Number(c))));
    check('numeric columns are numbers (decimals scaled)', numeric);
  }

  // Derived metadata must match the committed generated file.
  const recomputed = JSON.stringify(extractMetrics(astOf(canonical)));
  check(
    'metadata is up to date (else run `pnpm meta:generate`)',
    recomputed === JSON.stringify(questionMetadata[q.id]),
    'stale',
  );

  // A required-construct assertion must actually be satisfiable: at least one
  // authored canonical solution has to use the construct (ADR 0004 update).
  if (q.requires) {
    const satisfied = Object.values(q.canonical).some(
      (sql) => sql && q.requires!.pattern.test(sql),
    );
    check(`a canonical solution satisfies requires (${q.requires.pattern})`, satisfied);
  }

  // Per-dialect solutions (e.g. canonical.snowflake) must transpile to DuckDB
  // and produce the same output as the generic canonical (ADR 0006).
  for (const [dialect, solution] of Object.entries(q.canonical)) {
    if (dialect === 'generic' || !solution) continue;
    const read = POLY[dialect as Dialect];
    if (!read) continue;
    const t = poly.transpile(solution.trim(), read, 'duckdb');
    if (!t.success || !t.sql?.length) {
      check(`${dialect} solution transpiles`, false, t.error ?? 'no output');
      continue;
    }
    try {
      const got = runQuery(fixupDuckDbSql(t.sql.join(';\n')));
      check(`${dialect} solution transpiles and matches`, grade(expected, got, q.grading).correct);
    } catch (e) {
      check(`${dialect} solution runs`, false, String(e).split('\n')[0]);
    }
  }

  // Debug challenges: the starter must run AND grade as wrong (a real bug to fix).
  if (q.challengeType === 'debug' && q.starterSql) {
    try {
      const starterOut = runQuery(q.starterSql.trim());
      check(
        'debug starter runs and is actually wrong',
        !grade(expected, starterOut, q.grading).correct,
        'starter already matches the expected output',
      );
    } catch (e) {
      check('debug starter runs and is actually wrong', false, `starter errored: ${String(e)}`);
    }
  }
}

// Question-specific expectations for the seed question.
console.log('\nQuestion-specific checks');
exec(getDataset('ecommerce').setupSql);
const q1 = questions.find((q) => q.id === 'q-customer-completed-revenue')!;
const expected = runQuery((q1.canonical.generic ?? '').trim());
check('wrong shape is Incorrect', !grade(expected, runQuery('SELECT name FROM customers'), q1.grading).correct);
check(
  'wrong row order is Incorrect (orderMatters)',
  !grade(
    expected,
    runQuery(
      "SELECT c.name, SUM(o.amount) AS total FROM customers c JOIN orders o ON o.customer_id=c.customer_id WHERE o.status='completed' GROUP BY c.name ORDER BY c.name",
    ),
    q1.grading,
  ).correct,
);
check(
  'a correct answer returning DOUBLE still grades Correct (cross-type)',
  grade(
    expected,
    runQuery(
      "SELECT c.name, SUM(o.amount)::DOUBLE AS total FROM customers c JOIN orders o ON o.customer_id=c.customer_id WHERE o.status='completed' GROUP BY c.name ORDER BY total DESC, c.name",
    ),
    q1.grading,
  ).correct,
);

// Learning paths must reference real question ids.
console.log('\nLearning path checks');
const ids = new Set(questions.map((q) => q.id));
for (const p of paths) {
  const missing = p.questionIds.filter((id) => !ids.has(id));
  check(`path "${p.id}" references valid questions`, missing.length === 0, missing.join(', '));
}

console.log(`\n${failures === 0 ? 'ALL CONTENT CHECKS PASSED ✓' : `${failures} CHECK(S) FAILED ✗`}`);
process.exit(failures === 0 ? 0 : 1);
