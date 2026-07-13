/**
 * Quote/comment-aware SQL scanning — finds top-level `;` positions without being
 * fooled by a `;` inside a string literal or a comment (see issue 0003: the old
 * naive `sql.split(';')` broke on `SELECT REPLACE(status, ';', ',') FROM orders`).
 * Handles: single-quoted strings (`''` escapes), double-quoted identifiers (`""`
 * escapes), `--` line comments, `/* *\/` block comments. Adapted from `scanArgs`
 * in `engine/transpile.ts`, which does the same kind of literal-aware scanning
 * for call-argument commas.
 *
 * This is the shared primitive `statement.ts` is built on; `engine/duckdb.ts`'s
 * `exec` (and its dbt statement splitter) and `dbt/challenge.ts`'s `statements`
 * still do the naive split and should adopt `splitStatements` in a follow-up
 * (tracked in issue 0003/0005) — they're authored-content paths gated by
 * `verify:content`/`verify:dbt`, so lower risk than the live editor.
 */

/** Positions (indices into `sql`) of every top-level `;` — i.e. not inside a
 *  single- or double-quoted literal, a `--` line comment, or a `/* *\/` block
 *  comment. Always ascending. */
export function topLevelSemicolons(sql: string): number[] {
  const positions: number[] = [];
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (ch === "'") {
        if (next === "'") i++; // '' escape — stay in the string
        else inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (ch === '"') {
        if (next === '"') i++; // "" escape — stay in the identifier
        else inDouble = false;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === ';') positions.push(i);
  }

  return positions;
}

/** The `;` position at or after `pos` (top-level only), or -1 if none. */
export function nextTopLevelSemicolon(sql: string, pos: number): number {
  for (const p of topLevelSemicolons(sql)) if (p >= pos) return p;
  return -1;
}

/** The `;` position before `pos` (top-level only), or -1 if none. */
export function prevTopLevelSemicolon(sql: string, pos: number): number {
  let result = -1;
  for (const p of topLevelSemicolons(sql)) {
    if (p >= pos) break;
    result = p;
  }
  return result;
}

export interface SqlStatementRange {
  from: number;
  to: number;
  text: string;
}

/** Split `sql` into statement ranges on top-level `;`, trimming surrounding
 *  whitespace from each and dropping empty ones (e.g. a stray `;;`). */
export function splitStatementRanges(sql: string): SqlStatementRange[] {
  const semis = topLevelSemicolons(sql);
  const bounds = [0, ...semis.map((p) => p + 1), sql.length];
  const ranges: SqlStatementRange[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const rawStart = bounds[i]!;
    const rawEnd = i === bounds.length - 2 ? sql.length : bounds[i + 1]! - 1;
    const slice = sql.slice(rawStart, rawEnd);
    const text = slice.trim();
    if (!text) continue;
    const lead = slice.length - slice.trimStart().length;
    const trail = slice.length - slice.trimEnd().length;
    ranges.push({ from: rawStart + lead, to: rawEnd - trail, text });
  }
  return ranges;
}

/** Trimmed, non-empty top-level statements — the shape `exec`/`challenge.ts`
 *  want (drop-in replacement for their naive `split(';').map(trim).filter(Boolean)`). */
export function splitStatements(sql: string): string[] {
  return splitStatementRanges(sql).map((s) => s.text);
}
