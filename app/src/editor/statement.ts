import { nextTopLevelSemicolon, prevTopLevelSemicolon, splitStatements } from './splitSql';

export interface StatementRange {
  from: number;
  to: number;
  text: string;
}

/**
 * The SQL statement surrounding `pos`, for "run the query my cursor is in".
 * Splits on top-level `;` only — quote/comment-aware via `splitSql.ts`, so a
 * `;` inside a string literal, quoted identifier, or comment doesn't split the
 * statement (issue 0003). Returns the trimmed range + text, or null if the
 * surrounding statement is empty.
 */
export function statementAt(doc: string, pos: number): StatementRange | null {
  const prevSemi = prevTopLevelSemicolon(doc, pos);
  const rawStart = prevSemi + 1; // 0 if none
  const nextSemi = nextTopLevelSemicolon(doc, pos);
  const rawEnd = nextSemi === -1 ? doc.length : nextSemi;

  const slice = doc.slice(rawStart, rawEnd);
  const text = slice.trim();
  if (!text) return null;

  const lead = slice.length - slice.trimStart().length;
  const trail = slice.length - slice.trimEnd().length;
  return { from: rawStart + lead, to: rawEnd - trail, text };
}

/** Number of non-empty top-level statements in the document. */
export function statementCount(doc: string): number {
  return splitStatements(doc).length;
}

/**
 * Line-based statement selection (what Run / the highlight use): looks at the
 * line the cursor is on rather than the exact column.
 *  - content line  → the query the line's first non-whitespace belongs to
 *    (so a cursor anywhere on any line of a multi-line query selects it).
 *  - empty line    → the last query that ends *before* this line.
 */
export function statementForCursor(doc: string, pos: number): StatementRange | null {
  const lineStart = doc.lastIndexOf('\n', pos - 1) + 1;
  let lineEnd = doc.indexOf('\n', pos);
  if (lineEnd === -1) lineEnd = doc.length;
  const lineText = doc.slice(lineStart, lineEnd);

  if (lineText.trim() === '') {
    const before = doc.slice(0, lineStart).replace(/\s+$/, '');
    if (!before) return statementAt(doc, pos); // nothing above — fall back
    return statementAt(doc, before.length - 1); // last non-whitespace before the line
  }

  const lead = lineText.length - lineText.trimStart().length;
  return statementAt(doc, lineStart + lead); // first non-whitespace on the line
}
