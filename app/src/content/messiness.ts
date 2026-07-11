/**
 * Per-question data messiness (see ADR-adjacent ROADMAP note). A question may
 * opt its dataset into realistic mess — the solver has to account for it, but the
 * prompt only says the data is messy, not how. The canonical solution is authored
 * to handle it, so output-equivalence grading still works.
 *
 * Transforms are generated as deterministic SQL applied AFTER the dataset's
 * setupSql. Row selection is keyed on `hash(rowid || salt)` — **per row** (so a
 * low-cardinality column like `status` gets a realistic mix, not all-or-nothing)
 * and reproducible (so `verify:content`'s determinism check holds).
 */
export interface ColumnMessiness {
  /** Fraction of rows whose value becomes NULL. */
  nullRate?: number;
  /** Fraction of rows whose text value is upper/lower-cased (inconsistent case). */
  caseNoise?: number;
  /** Fraction of rows that gain stray leading/trailing whitespace. */
  whitespace?: number;
  /** Fraction of rows duplicated (whole-row copies with fresh, independently
   *  dirtied values). Table-level; the column part of the key is ignored. */
  duplicates?: number;
}

/** Keys are `"table.column"`. */
export type MessinessSpec = Record<string, ColumnMessiness>;

const RES = 10_000;
const pct = (r: number) => Math.round(Math.max(0, Math.min(1, r)) * RES);
/** Deterministic per-row selector: an independent reproducible subset per salt. */
const sel = (salt: string) => `(hash(rowid || '${salt}') % ${RES})`;

function parseKey(key: string): [string, string] {
  const i = key.indexOf('.');
  return [key.slice(0, i), key.slice(i + 1)];
}

/**
 * Build the SQL that dirties a freshly-seeded dataset per `spec`. Returned in
 * apply order: duplicates first (so copies get independent noise), then value
 * mutations, then nulls.
 */
export function buildMessinessSql(spec: MessinessSpec): string[] {
  const cols = Object.entries(spec);
  const stmts: string[] = [];

  // 1. Duplicate whole rows first (ORDER BY rowid → deterministic new rowids).
  for (const [key, m] of cols) {
    if (m.duplicates) {
      const [t] = parseKey(key);
      stmts.push(
        `INSERT INTO ${t} SELECT * FROM ${t} WHERE ${sel(`dup:${key}`)} < ${pct(m.duplicates)} ORDER BY rowid`,
      );
    }
  }
  // 2. Value mutations (case, whitespace) — per row.
  for (const [key, m] of cols) {
    const [t, c] = parseKey(key);
    if (m.caseNoise) {
      stmts.push(
        `UPDATE ${t} SET ${c} = CASE WHEN hash(rowid || 'cx:${key}') % 2 = 0 THEN UPPER(${c}) ELSE LOWER(${c}) END WHERE ${sel(`case:${key}`)} < ${pct(m.caseNoise)} AND ${c} IS NOT NULL`,
      );
    }
    if (m.whitespace) {
      stmts.push(
        `UPDATE ${t} SET ${c} = CASE WHEN hash(rowid || 'wx:${key}') % 2 = 0 THEN ${c} || ' ' ELSE ' ' || ${c} END WHERE ${sel(`ws:${key}`)} < ${pct(m.whitespace)} AND ${c} IS NOT NULL`,
      );
    }
  }
  // 3. Nulls last (so a nulled value isn't then case/whitespace-mutated).
  for (const [key, m] of cols) {
    if (m.nullRate) {
      const [t, c] = parseKey(key);
      stmts.push(`UPDATE ${t} SET ${c} = NULL WHERE ${sel(`null:${key}`)} < ${pct(m.nullRate)}`);
    }
  }
  return stmts;
}
