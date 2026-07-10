import { describe, it, expect } from 'vitest';
import { checkRequiredConstruct } from './requireConstruct';

const startsWith = { pattern: /startswith/i, message: 'Use STARTSWITH.' };

describe('checkRequiredConstruct', () => {
  it('passes (null) when there is no requirement', () => {
    expect(checkRequiredConstruct("SELECT * FROM t WHERE name LIKE 'A%'")).toBeNull();
  });

  it('passes when the required construct is present (case-insensitive)', () => {
    expect(checkRequiredConstruct("SELECT * WHERE STARTSWITH(name, 'A')", startsWith)).toBeNull();
    expect(checkRequiredConstruct("select startswith(name, 'a')", startsWith)).toBeNull();
  });

  it('returns the message when the construct is missing', () => {
    expect(checkRequiredConstruct("SELECT * WHERE name LIKE 'A%'", startsWith)).toBe(
      'Use STARTSWITH.',
    );
  });

  it('does not match a different-but-similar construct (starts_with vs startswith)', () => {
    // DuckDB spells it starts_with; the Snowflake question requires STARTSWITH.
    expect(checkRequiredConstruct("WHERE starts_with(name, 'A')", startsWith)).toBe('Use STARTSWITH.');
  });

  it('respects word boundaries in the pattern (IFF, not "diff")', () => {
    const iff = { pattern: /\biff\s*\(/i, message: 'Use IFF.' };
    expect(checkRequiredConstruct('SELECT DATEDIFF(day, a, b)', iff)).toBe('Use IFF.');
    expect(checkRequiredConstruct("SELECT IFF(x > 1, 'a', 'b')", iff)).toBeNull();
  });
});
