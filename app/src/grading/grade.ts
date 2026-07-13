import type { Cell, ResultSet } from './types';

/**
 * Output-equivalence grading (see decisions/0004-grading-algorithm.md).
 * Pure and deterministic — the most heavily tested module in the app.
 */
export interface GradeOptions {
  /** Compare rows positionally instead of as an order-insensitive multiset. */
  orderMatters?: boolean;
  /** Require column names to match (case-insensitive). */
  requireColumnNames?: boolean;
  /** Absolute numeric tolerance; 0 uses a tiny relative epsilon to absorb float noise. */
  numericTolerance?: number;
  /** Case-sensitive string comparison. */
  caseSensitiveText?: boolean;
}

export interface GradeResult {
  correct: boolean;
  /** Human-friendly explanations of any mismatch (never reveals the canonical answer). */
  reasons: string[];
}

type Family = 'null' | 'number' | 'boolean' | 'string' | 'date';
interface Norm {
  f: Family;
  v: number | string | boolean | null;
}

function normalize(cell: Cell, caseSensitiveText: boolean): Norm {
  if (cell === null || cell === undefined) return { f: 'null', v: null };
  // Precision note: DuckDB returns BIGINT/HUGEINT as `bigint`; converting to `number`
  // loses exactness above 2^53 (Number.MAX_SAFE_INTEGER). Accepted trade-off — grading
  // already compares numbers with a float epsilon (see cellsEqual), and exact
  // arbitrary-precision integer equality isn't a current requirement.
  if (typeof cell === 'bigint') return { f: 'number', v: Number(cell) };
  if (typeof cell === 'number') return { f: 'number', v: cell };
  if (typeof cell === 'boolean') return { f: 'boolean', v: cell };
  if (cell instanceof Date) return { f: 'date', v: cell.getTime() };
  const s = String(cell);
  return { f: 'string', v: caseSensitiveText ? s : s.toLowerCase() };
}

function cellsEqual(a: Norm, b: Norm, tolerance: number): boolean {
  if (a.f !== b.f) return false; // cross-family mismatch (e.g. '1' vs 1) is not equal
  if (a.f === 'number') {
    const x = a.v as number;
    const y = b.v as number;
    // Short-circuit exact equality before the epsilon math: this covers ±Infinity
    // (Infinity - Infinity is NaN, which would otherwise fail Math.abs(x - y) <= eps)
    // and makes -Infinity correctly not equal to Infinity.
    if (x === y) return true;
    if (Number.isNaN(x) || Number.isNaN(y)) return Number.isNaN(x) && Number.isNaN(y);
    // One side is ±Infinity and they aren't equal (the x === y check above already
    // caught Infinity === Infinity): reject rather than let Infinity - Infinity (NaN)
    // or an Infinity-sized epsilon pass the tolerance check below.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const eps = tolerance > 0 ? tolerance : 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
    return Math.abs(x - y) <= eps;
  }
  return a.v === b.v;
}

function rowsEqual(a: Norm[], b: Norm[], tolerance: number): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!cellsEqual(a[i]!, b[i]!, tolerance)) return false;
  }
  return true;
}

export function grade(
  expected: ResultSet,
  actual: ResultSet,
  options: GradeOptions = {},
): GradeResult {
  const orderMatters = options.orderMatters ?? false;
  const requireColumnNames = options.requireColumnNames ?? false;
  const tolerance = options.numericTolerance ?? 0;
  const caseSensitiveText = options.caseSensitiveText ?? true;

  // 1. Column count (positional comparison).
  if (expected.columns.length !== actual.columns.length) {
    return {
      correct: false,
      reasons: [
        `Expected ${expected.columns.length} column(s) but your query returned ${actual.columns.length}.`,
      ],
    };
  }

  // 2. Column names (opt-in).
  if (requireColumnNames) {
    const nameReasons: string[] = [];
    for (let i = 0; i < expected.columns.length; i++) {
      const e = expected.columns[i]!.name.toLowerCase();
      const a = actual.columns[i]!.name.toLowerCase();
      if (e !== a) {
        nameReasons.push(
          `Column ${i + 1} should be named "${expected.columns[i]!.name}" but was "${actual.columns[i]!.name}".`,
        );
      }
    }
    if (nameReasons.length) return { correct: false, reasons: nameReasons };
  }

  // 3. Normalize cells.
  const exp = expected.rows.map((r) => r.map((c) => normalize(c, caseSensitiveText)));
  const act = actual.rows.map((r) => r.map((c) => normalize(c, caseSensitiveText)));

  const reasons: string[] = [];
  if (exp.length !== act.length) {
    reasons.push(`Expected ${exp.length} row(s) but your query returned ${act.length}.`);
  }

  // 4a. Order-sensitive: positional row comparison.
  if (orderMatters) {
    const n = Math.min(exp.length, act.length);
    for (let i = 0; i < n; i++) {
      if (!rowsEqual(exp[i]!, act[i]!, tolerance)) {
        reasons.push(`Row ${i + 1} does not match (this question requires a specific row order).`);
        break;
      }
    }
    return { correct: reasons.length === 0, reasons };
  }

  // 4b. Order-insensitive: multiset match (duplicates are significant).
  const remaining = act.slice();
  let missing = 0;
  for (const er of exp) {
    const idx = remaining.findIndex((ar) => rowsEqual(er, ar, tolerance));
    if (idx === -1) missing++;
    else remaining.splice(idx, 1);
  }
  if (missing > 0) reasons.push(`${missing} expected row(s) were missing from your result.`);
  if (remaining.length > 0) {
    reasons.push(`${remaining.length} unexpected row(s) were present in your result.`);
  }
  return { correct: reasons.length === 0, reasons };
}

export interface GradeDiff {
  expectedColumns: string[];
  actualColumns: string[];
  /** True when column count differs, or (with requireColumnNames) names differ.
   *  The row diff below is only skipped for a count mismatch; a names-only
   *  mismatch still returns the computed missing/extra rows, which is useful
   *  for the "why is this wrong" view alongside the column complaint. */
  columnMismatch: boolean;
  /** Rows in the expected output absent from the user's (original cell values). */
  missingRows: Cell[][];
  /** Rows in the user's output not expected. */
  extraRows: Cell[][];
  /** Order-only failure: same rows, first position that differs. */
  orderWrong: { index: number; expected: Cell[]; actual: Cell[] } | null;
}

/** A structured diff for the "why is this wrong" view (uses the same
 *  normalisation as grade()). Returns original cell values for display. */
export function diffResults(
  expected: ResultSet,
  actual: ResultSet,
  options: GradeOptions = {},
): GradeDiff {
  const requireColumnNames = options.requireColumnNames ?? false;
  const tolerance = options.numericTolerance ?? 0;
  const caseSensitiveText = options.caseSensitiveText ?? true;
  const orderMatters = options.orderMatters ?? false;

  const expectedColumns = expected.columns.map((c) => c.name);
  const actualColumns = actual.columns.map((c) => c.name);

  if (expectedColumns.length !== actualColumns.length) {
    return { expectedColumns, actualColumns, columnMismatch: true, missingRows: [], extraRows: [], orderWrong: null };
  }
  const namesDiffer =
    requireColumnNames &&
    expectedColumns.some((n, i) => n.toLowerCase() !== (actualColumns[i] ?? '').toLowerCase());

  const expNorm = expected.rows.map((r) => r.map((c) => normalize(c, caseSensitiveText)));
  const actNorm = actual.rows.map((r) => r.map((c) => normalize(c, caseSensitiveText)));

  const used = new Array<boolean>(actNorm.length).fill(false);
  const missingRows: Cell[][] = [];
  for (let e = 0; e < expNorm.length; e++) {
    const idx = actNorm.findIndex((ar, i) => !used[i] && rowsEqual(expNorm[e]!, ar, tolerance));
    if (idx === -1) missingRows.push(expected.rows[e]!);
    else used[idx] = true;
  }
  const extraRows = actual.rows.filter((_, i) => !used[i]);

  let orderWrong: GradeDiff['orderWrong'] = null;
  if (orderMatters && missingRows.length === 0 && extraRows.length === 0) {
    const n = Math.min(expNorm.length, actNorm.length);
    for (let i = 0; i < n; i++) {
      if (!rowsEqual(expNorm[i]!, actNorm[i]!, tolerance)) {
        orderWrong = { index: i, expected: expected.rows[i]!, actual: actual.rows[i]! };
        break;
      }
    }
  }

  return { expectedColumns, actualColumns, columnMismatch: namesDiffer, missingRows, extraRows, orderWrong };
}
