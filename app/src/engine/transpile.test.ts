import { describe, it, expect } from 'vitest';
import { needsTranspile, toDuckDB } from './transpile';

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
