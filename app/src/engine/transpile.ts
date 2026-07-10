import type { DialectFilter } from '../content/dialects';

/**
 * Translates a user's SQL from their chosen dialect to DuckDB (our execution
 * engine) using polyglot, a Rust/WASM sqlglot-compatible transpiler. Lazy-loaded
 * so the ~4 MB wasm only downloads when someone actually picks a non-generic
 * dialect (see ADR 0006). `'generic'`/`'all'` pass through unchanged — those are
 * authored/run directly as DuckDB SQL.
 */

// Our product dialects → polyglot read-dialect names. Absent = no transpile.
const POLY_DIALECT: Partial<Record<DialectFilter, string>> = {
  snowflake: 'snowflake',
  bigquery: 'bigquery',
  postgres: 'postgres',
  mysql: 'mysql',
  sqlserver: 'tsql',
};

export function needsTranspile(dialect: DialectFilter): boolean {
  return dialect in POLY_DIALECT;
}

/** Thrown when the user's SQL can't be parsed/transpiled from their dialect. */
export class TranspileError extends Error {}

interface TranspileResult {
  success: boolean;
  sql?: string[];
  error?: string;
  errorLine?: number;
}
interface Polyglot {
  init: () => Promise<void>;
  transpile: (sql: string, read: string, write: string) => TranspileResult;
}

let polyPromise: Promise<Polyglot> | null = null;
function loadPolyglot(): Promise<Polyglot> {
  if (!polyPromise) {
    polyPromise = import('@polyglot-sql/sdk').then(async (m) => {
      const poly = m as unknown as Polyglot;
      await poly.init();
      return poly;
    });
  }
  return polyPromise;
}

export interface Transpiled {
  sql: string;
  /** 1-based line the transpile error occurred on (if any). */
  errorLine?: number;
}

/**
 * Split the argument list of a call, given the index of its opening `(`.
 * Returns the top-level args (trimmed) and the index just past the matching
 * `)`, or null if unbalanced. Respects nested `()[]{}` and `'…'` string
 * literals (with `''` escapes) so commas inside them don't split args.
 */
function scanArgs(sql: string, openParen: number): { args: string[]; end: number } | null {
  let paren = 0;
  let square = 0;
  let curly = 0;
  let inStr = false;
  const args: string[] = [];
  let cur = '';
  for (let k = openParen; k < sql.length; k++) {
    const ch = sql[k]!;
    if (inStr) {
      cur += ch;
      if (ch === "'") {
        if (sql[k + 1] === "'") {
          cur += "'";
          k++;
        } else {
          inStr = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
      continue;
    }
    if (ch === '(') {
      paren++;
      if (paren === 1) continue; // opening paren of this call — not part of args
      cur += ch;
      continue;
    }
    if (ch === ')') {
      paren--;
      if (paren === 0) {
        if (cur.trim() !== '' || args.length > 0) args.push(cur.trim());
        return { args, end: k + 1 };
      }
      cur += ch;
      continue;
    }
    if (ch === '[') square++;
    if (ch === ']') square--;
    if (ch === '{') curly++;
    if (ch === '}') curly--;
    if (ch === ',' && paren === 1 && square === 0 && curly === 0) {
      args.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  return null; // unbalanced
}

/**
 * Rewrite every top-level call to one of `names` (case-insensitive, identifier
 * boundary respected) by passing its parsed args to `transform`. A null return
 * leaves that call untouched. Restarts after each rewrite so nested calls are
 * handled; SQL here is short so the re-scan is cheap.
 */
function rewriteCall(
  sql: string,
  names: string[],
  transform: (args: string[]) => string | null,
): string {
  const lower = sql.toLowerCase();
  for (let i = 0; i < sql.length; i++) {
    for (const name of names) {
      if (!lower.startsWith(name, i)) continue;
      const before = i > 0 ? sql[i - 1]! : '';
      if (/[A-Za-z0-9_]/.test(before)) continue; // part of a longer identifier
      let j = i + name.length;
      while (j < sql.length && /\s/.test(sql[j]!)) j++;
      if (sql[j] !== '(') continue;
      const parsed = scanArgs(sql, j);
      if (!parsed) continue;
      const replacement = transform(parsed.args);
      if (replacement == null) continue;
      return rewriteCall(sql.slice(0, i) + replacement + sql.slice(parsed.end), names, transform);
    }
  }
  return sql;
}

/**
 * Post-transpile fixups for Snowflake constructs that polyglot passes through
 * verbatim but DuckDB spells differently. Deliberately small and conservative
 * (ADR 0006 follow-up): only safe, unambiguous rewrites that unlock common
 * Snowflake authoring.
 *   - TO_VARCHAR(x) / TO_CHAR(x)  → CAST(x AS VARCHAR)   (1-arg only)
 *   - STARTSWITH(a, b)            → starts_with(a, b)
 * Still deferred — left to surface as a normal transpile/run error until they
 * get real handling: TO_VARCHAR(x, fmt) date formatting, LATERAL FLATTEN,
 * RATIO_TO_REPORT. Pure; safe to run on any dialect's DuckDB output.
 */
export function fixupDuckDbSql(sql: string): string {
  let out = rewriteCall(sql, ['to_varchar', 'to_char'], (args) =>
    args.length === 1 ? `CAST(${args[0]} AS VARCHAR)` : null,
  );
  out = rewriteCall(out, ['startswith'], (args) =>
    args.length === 2 ? `starts_with(${args[0]}, ${args[1]})` : null,
  );
  return out;
}

/** Transpile `sql` from `dialect` to DuckDB SQL. Passes through for generic/all.
 *  Throws TranspileError (with an optional `errorLine`) on parse failure. */
export async function toDuckDB(sql: string, dialect: DialectFilter): Promise<string> {
  const read = POLY_DIALECT[dialect];
  if (!read) return sql;

  let poly: Polyglot;
  try {
    poly = await loadPolyglot();
  } catch (e) {
    throw new TranspileError(`Could not load the ${dialect} translator (${String(e)}).`);
  }

  const result = poly.transpile(sql, read, 'duckdb');
  if (!result.success || !result.sql || result.sql.length === 0) {
    const err = new TranspileError(
      result.error
        ? `Couldn't parse this as ${dialect} SQL: ${result.error}`
        : `Couldn't parse this as ${dialect} SQL.`,
    );
    (err as TranspileError & { errorLine?: number }).errorLine = result.errorLine;
    throw err;
  }
  return fixupDuckDbSql(result.sql.join(';\n'));
}
