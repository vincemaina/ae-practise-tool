import { describe, it, expect } from 'vitest';
import { buildMessinessSql } from './messiness';

describe('buildMessinessSql', () => {
  it('returns nothing for an empty spec', () => {
    expect(buildMessinessSql({})).toEqual([]);
  });

  it('emits per-transform statements keyed on rowid (per-row, deterministic)', () => {
    const sql = buildMessinessSql({ 'orders.status': { caseNoise: 0.3, whitespace: 0.2 } });
    expect(sql).toHaveLength(2);
    // Selection is per-row (hash(rowid ...)), not per-value.
    expect(sql.every((s) => s.includes('hash(rowid'))).toBe(true);
    expect(sql[0]).toContain('UPDATE orders SET status');
    expect(sql[0]).toContain('UPPER(status)');
  });

  it('scales rate to the resolution (0.3 → 3000/10000)', () => {
    const [s] = buildMessinessSql({ 't.c': { nullRate: 0.3 } });
    expect(s).toContain('< 3000');
    expect(s).toContain('SET c = NULL');
  });

  it('clamps out-of-range rates to [0,1]', () => {
    expect(buildMessinessSql({ 't.c': { nullRate: 2 } })[0]).toContain('< 10000');
    expect(buildMessinessSql({ 't.c': { nullRate: -1 } })[0]).toContain('< 0');
  });

  it('orders duplicates first, then mutations, then nulls', () => {
    const sql = buildMessinessSql({
      'customers.name': { nullRate: 0.1, caseNoise: 0.2, duplicates: 0.1 },
    });
    const kinds = sql.map((s) =>
      s.startsWith('INSERT') ? 'dup' : s.includes('= NULL') ? 'null' : 'mutate',
    );
    expect(kinds).toEqual(['dup', 'mutate', 'null']);
  });

  it('duplicates use the table from the key and preserve rowid order', () => {
    const [s] = buildMessinessSql({ 'customers.customer_id': { duplicates: 0.15 } });
    expect(s).toBe(
      'INSERT INTO customers SELECT * FROM customers WHERE (hash(rowid || \'dup:customers.customer_id\') % 10000) < 1500 ORDER BY rowid',
    );
  });
});
