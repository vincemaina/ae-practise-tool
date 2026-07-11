/**
 * Grading a dbt-challenge submission (ROADMAP dbt engine, phase 3). Two layers,
 * mirroring SQL questions:
 *  - output equivalence — the target model's rows must match the reference build;
 *  - structural checks — the submitted models must be built the right way (e.g. an
 *    incremental model, using ref()/is_incremental()), so passing on output alone
 *    isn't enough (the dbt analog of a question's `requires`).
 * The build+query is done by the caller (needs DuckDB); this module is pure.
 */
import { grade, type GradeOptions } from '../grading/grade';
import type { ResultSet } from '../grading/types';
import { compileModel } from './engine';
import { filesToModels, type DbtStructureCheck } from './challenge';

/** Return a failure message per unmet structural check (empty = all satisfied). */
export function checkStructure(
  files: Record<string, string>,
  checks: DbtStructureCheck[],
): string[] {
  const byName = new Map(filesToModels(files).map((m) => [m.name, m]));
  const failures: string[] = [];
  for (const c of checks) {
    const model = byName.get(c.model);
    if (!model) {
      failures.push(c.message ?? `Missing model '${c.model}'.`);
      continue;
    }
    const compiled = compileModel(model);
    const sql = model.sql.toLowerCase();
    const wrongMat = c.materialized !== undefined && compiled.materialized !== c.materialized;
    const missing = (c.mustUse ?? []).some((u) => !sql.includes(u.toLowerCase()));
    if (wrongMat || missing) {
      failures.push(
        c.message ??
          `Model '${c.model}' must be materialized '${c.materialized ?? compiled.materialized}'` +
            (c.mustUse ? ` and use ${c.mustUse.join(', ')}` : '') +
            '.',
      );
    }
  }
  return failures;
}

export interface DbtGradeResult {
  correct: boolean;
  reasons: string[];
}

/**
 * Grade a submission given the reference build (`expected`) and the submission's
 * build (`got`), plus the submitted `files` for the structural checks. Correct
 * requires both the output to match and every structural check to pass.
 */
export function gradeSubmission(
  expected: ResultSet,
  got: ResultSet,
  opts: { grading: GradeOptions; checks?: DbtStructureCheck[]; files: Record<string, string> },
): DbtGradeResult {
  const output = grade(expected, got, opts.grading);
  const structural = checkStructure(opts.files, opts.checks ?? []);
  return {
    correct: output.correct && structural.length === 0,
    reasons: [...(output.correct ? [] : output.reasons), ...structural],
  };
}
