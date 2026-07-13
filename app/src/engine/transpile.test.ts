import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { needsTranspile, toDuckDB, fixupDuckDbSql } from './transpile';

// Note: real Snowflake→DuckDB transpilation (via the polyglot wasm) is exercised
// end-to-end in `pnpm verify:content`; here we only cover the cheap passthrough
// logic so we don't load the 18 MB wasm in the unit run.
describe('transpile', () => {
  it('flags only concrete non-generic dialects as needing transpilation', () => {
    expect(needsTranspile('all')).toBe(false);
    expect(needsTranspile('generic')).toBe(false);
    expect(needsTranspile('snowflake')).toBe(true);
    expect(needsTranspile('bigquery')).toBe(true);
    expect(needsTranspile('postgres')).toBe(true);
  });

  it('passes SQL through unchanged for generic/all (no transpiler load)', async () => {
    await expect(toDuckDB('SELECT 1', 'generic')).resolves.toBe('SELECT 1');
    await expect(toDuckDB('SELECT 1', 'all')).resolves.toBe('SELECT 1');
  });
});

// The fixup pass rewrites the handful of Snowflake constructs polyglot leaves
// verbatim but DuckDB spells differently (ADR 0006 follow-up). Pure — no wasm.
describe('fixupDuckDbSql', () => {
  it('rewrites 1-arg TO_VARCHAR / TO_CHAR to a VARCHAR cast', () => {
    expect(fixupDuckDbSql('SELECT TO_VARCHAR(price) FROM products')).toBe(
      'SELECT CAST(price AS VARCHAR) FROM products',
    );
    expect(fixupDuckDbSql('SELECT TO_CHAR(id) FROM t')).toBe('SELECT CAST(id AS VARCHAR) FROM t');
  });

  it('is case-insensitive and tolerates whitespace before the paren', () => {
    expect(fixupDuckDbSql('SELECT to_varchar (x)')).toBe('SELECT CAST(x AS VARCHAR)');
  });

  it('leaves multi-arg TO_VARCHAR (format string) alone — deferred', () => {
    const sql = "SELECT TO_VARCHAR(created_at, 'YYYY-MM') FROM orders";
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  it('renames STARTSWITH to starts_with, preserving args', () => {
    expect(fixupDuckDbSql("SELECT STARTSWITH(name, 'Cust') FROM t")).toBe(
      "SELECT starts_with(name, 'Cust') FROM t",
    );
  });

  it('handles nested calls and expressions as the argument', () => {
    expect(fixupDuckDbSql('SELECT TO_VARCHAR(ROUND(price, 2)) FROM t')).toBe(
      'SELECT CAST(ROUND(price, 2) AS VARCHAR) FROM t',
    );
  });

  it('does not split on commas inside string literals or list arg', () => {
    expect(fixupDuckDbSql("SELECT TO_VARCHAR(concat(a, ','))")).toBe(
      "SELECT CAST(concat(a, ',') AS VARCHAR)",
    );
  });

  it('does not touch identifiers that merely end with a fixup name', () => {
    const sql = 'SELECT my_to_varchar(x), startswithal(y)';
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  it('leaves already-valid DuckDB SQL untouched', () => {
    const sql = "SELECT CAST(price AS VARCHAR), starts_with(name, 'A') FROM t";
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  // issue 0005: the outer scan matched call names textually, even inside a
  // string literal, so a docs-y literal mentioning the function name got
  // corrupted into a rewritten call.
  it('leaves a call name mentioned inside a string literal untouched (issue 0005)', () => {
    const sql = "SELECT 'call to_varchar(x) for docs' AS tip";
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  it('leaves STARTSWITH mentioned inside a string literal untouched', () => {
    const sql = "SELECT 'startswith(a, b) is a function' AS note";
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  it('leaves a call name inside a double-quoted identifier untouched', () => {
    const sql = 'SELECT price AS "to_varchar(1)" FROM products';
    expect(fixupDuckDbSql(sql)).toBe(sql);
  });

  it('leaves a call name mentioned inside a -- or /* */ comment untouched', () => {
    const lineComment = '-- call to_varchar(x) here\nSELECT price FROM products';
    expect(fixupDuckDbSql(lineComment)).toBe(lineComment);
    const blockComment = '/* startswith(a, b) */\nSELECT price FROM products';
    expect(fixupDuckDbSql(blockComment)).toBe(blockComment);
  });

  it('still rewrites a real call site that sits alongside a literal mentioning the name', () => {
    const sql = "SELECT TO_VARCHAR(price), 'to_varchar(x) as literal' AS note FROM t";
    expect(fixupDuckDbSql(sql)).toBe(
      "SELECT CAST(price AS VARCHAR), 'to_varchar(x) as literal' AS note FROM t",
    );
  });

  it('still rewrites a real STARTSWITH call after a literal mentioning the name', () => {
    const sql = "SELECT 'startswith(a, b) note', STARTSWITH(name, 'Cust') FROM t";
    expect(fixupDuckDbSql(sql)).toBe("SELECT 'startswith(a, b) note', starts_with(name, 'Cust') FROM t");
  });
});

// The polyglot wasm loader (`polyPromise`) memoized a rejected boot forever
// before this fix — one flaky first load bricked every dialect-transpile for
// the rest of the session (issue 0002). These tests reset the module between
// cases (and mock `@polyglot-sql/sdk`) since the loader's cache is module state.
describe('loadPolyglot retry (issue 0002)', () => {
  let init: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    vi.resetModules();
    init = vi.fn(async () => {});
    vi.doMock('@polyglot-sql/sdk', () => ({
      init: () => init(),
      transpile: vi.fn(() => ({ success: true, sql: ['SELECT 1'] })),
    }));
  });

  afterEach(() => {
    vi.doUnmock('@polyglot-sql/sdk');
  });

  it('retries after the wasm module fails to init once, instead of staying broken', async () => {
    init.mockRejectedValueOnce(new Error('wasm blip'));
    const fresh = await import('./transpile');

    await expect(fresh.toDuckDB('SELECT 1', 'snowflake')).rejects.toThrow(fresh.TranspileError);
    // Recovers on the very next call — no reload needed.
    await expect(fresh.toDuckDB('SELECT 1', 'snowflake')).resolves.toBe('SELECT 1');
    expect(init).toHaveBeenCalledTimes(2);
  });

  it('happy path still loads the translator once and stays lazy', async () => {
    const fresh = await import('./transpile');
    await fresh.toDuckDB('SELECT 1', 'snowflake');
    await fresh.toDuckDB('SELECT 1', 'snowflake');
    expect(init).toHaveBeenCalledTimes(1);
  });
});
