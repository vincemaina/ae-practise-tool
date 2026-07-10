import { describe, it, expect } from 'vitest';
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
});
