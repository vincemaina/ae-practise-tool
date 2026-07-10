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
  return result.sql.join(';\n');
}
