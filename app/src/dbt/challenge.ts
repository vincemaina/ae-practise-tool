/**
 * A "dbt challenge" — the content model for the dbt practice pillar (ROADMAP dbt
 * engine, phase 2). The user edits model files to solve a task; grading builds the
 * project and compares the target model's output to the reference solution's
 * (output-equivalence, per ADR 0003). Incremental challenges build twice (with an
 * `increment` of new source rows) to test the incremental logic, not a rebuild.
 */
import type { GradeOptions } from '../grading/grade';
import { build, type DbtRunner, type Materialization, type Model } from './engine';

/** A structural requirement on a submitted model, checked on top of output
 *  equivalence — so producing the right rows the wrong way (e.g. a table instead
 *  of an incremental model) is still marked incorrect. See dbt/grade.ts. */
export interface DbtStructureCheck {
  /** Model name (a `models/<name>.sql` file) the check applies to. */
  model: string;
  /** The model must be configured with this materialization. */
  materialized?: Materialization;
  /** Case-insensitive substrings that must appear (e.g. `ref(`, `is_incremental`, `source(`). */
  mustUse?: string[];
  /** Shown when the check fails. */
  message?: string;
}

export interface DbtChallenge {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  /** Idempotent SQL that seeds the raw source tables (CREATE OR REPLACE …). */
  sources: string;
  /** Files the user starts with: path (e.g. `models/stg_orders.sql`) → contents. */
  starter: Record<string, string>;
  /** Reference solution files → the expected build. */
  solution: Record<string, string>;
  /** The model whose output is graded. */
  target: string;
  grading: GradeOptions;
  /** Structural requirements on the submitted models (beyond output equivalence). */
  checks?: DbtStructureCheck[];
  /** Incremental challenges only: extra source SQL applied before a 2nd build. */
  increment?: string;
  hints?: string[];
}

/** Turn a file map into engine models. Only `models/*.sql` files are models; the
 *  model name is the file's basename without `.sql`. Other files (yml, etc.) are
 *  ignored for now (source config comes later). */
export function filesToModels(files: Record<string, string>): Model[] {
  return Object.entries(files)
    .filter(([path]) => /(^|\/)models\/[^/]+\.sql$/.test(path))
    .map(([path, sql]) => ({ name: path.replace(/^.*\//, '').replace(/\.sql$/, ''), sql }));
}

/** Split multi-statement SQL into individual statements. */
function statements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Seed sources and build a challenge's model files against `runner`. For an
 * incremental challenge, applies `increment` and builds a second time so the
 * target reflects real incremental behaviour.
 */
export async function buildChallenge(
  runner: DbtRunner,
  challenge: Pick<DbtChallenge, 'sources' | 'increment'>,
  files: Record<string, string>,
): Promise<void> {
  for (const stmt of statements(challenge.sources)) await runner.run(stmt);
  const models = filesToModels(files);
  await build(runner, models);
  if (challenge.increment) {
    for (const stmt of statements(challenge.increment)) await runner.run(stmt);
    await build(runner, models); // incremental run
  }
}
