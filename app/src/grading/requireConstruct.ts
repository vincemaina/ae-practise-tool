/**
 * Optional "required construct" check for function/dialect showcase questions
 * (see decisions/0004-grading-algorithm.md, 2026-07-10 update).
 *
 * Output-equivalence grading can't distinguish two queries that return the same
 * rows — so a "use function X" question (e.g. Snowflake STARTSWITH) can be
 * solved a different way (LIKE) and still pass. For those questions we layer a
 * small assertion on top: the SQL the user actually typed (their dialect,
 * pre-transpile) must contain the construct. Pure and unit-tested.
 */
export interface RequiredConstruct {
  /** Matched against the user's typed SQL. Do not use the global (`g`) flag —
   *  `.test()` is stateful with it. */
  pattern: RegExp;
  /** Shown as the failure reason when the construct is missing. Never reveals
   *  the canonical solution — just names the construct to use. */
  message: string;
}

/** Returns the failure message when `sql` is missing the required construct,
 *  else null. A missing `requires` is always a pass (null). */
export function checkRequiredConstruct(
  sql: string,
  requires?: RequiredConstruct,
): string | null {
  if (!requires) return null;
  return requires.pattern.test(sql) ? null : requires.message;
}
