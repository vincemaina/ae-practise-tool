import { describe, it, expect } from 'vitest';
import { grade, diffResults } from './grade';
import type { ResultSet } from './types';

const rs = (columns: string[], rows: ResultSet['rows']): ResultSet => ({
  columns: columns.map((name) => ({ name, type: 'unknown' })),
  rows,
});

describe('grade', () => {
  it('accepts an identical result', () => {
    const a = rs(['name', 'total'], [['Ava', 80], ['Ben', 99]]);
    expect(grade(a, a).correct).toBe(true);
  });

  it('ignores row order by default (multiset)', () => {
    const exp = rs(['x'], [[1], [2], [3]]);
    const act = rs(['x'], [[3], [1], [2]]);
    expect(grade(exp, act).correct).toBe(true);
  });

  it('treats duplicate rows as significant', () => {
    const exp = rs(['x'], [[1], [1]]);
    const act = rs(['x'], [[1]]);
    expect(grade(exp, act).correct).toBe(false);
  });

  it('enforces order when orderMatters', () => {
    const exp = rs(['x'], [[1], [2]]);
    const act = rs(['x'], [[2], [1]]);
    expect(grade(exp, act, { orderMatters: true }).correct).toBe(false);
    expect(grade(exp, exp, { orderMatters: true }).correct).toBe(true);
  });

  it('fails on column count mismatch', () => {
    const exp = rs(['a', 'b'], [[1, 2]]);
    const act = rs(['a'], [[1]]);
    expect(grade(exp, act).correct).toBe(false);
  });

  it('treats int and float of equal value as equal', () => {
    const exp = rs(['x'], [[1]]);
    const act = rs(['x'], [[1.0]]);
    expect(grade(exp, act).correct).toBe(true);
  });

  it('coerces bigint to number for comparison', () => {
    const exp = rs(['x'], [[10]]);
    const act = rs(['x'], [[10n]]);
    expect(grade(exp, act).correct).toBe(true);
  });

  it('absorbs float noise with the default epsilon', () => {
    const exp = rs(['x'], [[0.1 + 0.2]]);
    const act = rs(['x'], [[0.3]]);
    expect(grade(exp, act).correct).toBe(true);
  });

  it('respects an explicit numericTolerance', () => {
    const exp = rs(['x'], [[100]]);
    const act = rs(['x'], [[100.4]]);
    expect(grade(exp, act, { numericTolerance: 0.5 }).correct).toBe(true);
    expect(grade(exp, act, { numericTolerance: 0.1 }).correct).toBe(false);
  });

  it('matches NULLs to NULLs but not to other values', () => {
    expect(grade(rs(['x'], [[null]]), rs(['x'], [[null]])).correct).toBe(true);
    expect(grade(rs(['x'], [[null]]), rs(['x'], [[0]])).correct).toBe(false);
    expect(grade(rs(['x'], [[null]]), rs(['x'], [['']])).correct).toBe(false);
  });

  it('does not equate a numeric string with a number (cross-family)', () => {
    expect(grade(rs(['x'], [['1']]), rs(['x'], [[1]])).correct).toBe(false);
  });

  it('is case-sensitive for text by default, relaxable via option', () => {
    const exp = rs(['x'], [['Ava']]);
    const act = rs(['x'], [['ava']]);
    expect(grade(exp, act).correct).toBe(false);
    expect(grade(exp, act, { caseSensitiveText: false }).correct).toBe(true);
  });

  it('ignores column names by default but enforces them when required', () => {
    const exp = rs(['total'], [[5]]);
    const act = rs(['sum_amount'], [[5]]);
    expect(grade(exp, act).correct).toBe(true);
    expect(grade(exp, act, { requireColumnNames: true }).correct).toBe(false);
  });

  it('treats Infinity as equal to itself', () => {
    const exp = rs(['x'], [[Infinity]]);
    const act = rs(['x'], [[Infinity]]);
    expect(grade(exp, act).correct).toBe(true);
  });

  it('does not treat Infinity and -Infinity as equal', () => {
    const exp = rs(['x'], [[Infinity]]);
    const act = rs(['x'], [[-Infinity]]);
    expect(grade(exp, act).correct).toBe(false);
  });

  it('still matches NaN to NaN', () => {
    const exp = rs(['x'], [[NaN]]);
    const act = rs(['x'], [[NaN]]);
    expect(grade(exp, act).correct).toBe(true);
    expect(grade(exp, rs(['x'], [[0]])).correct).toBe(false);
  });

  it('compares Date cells by their timestamp', () => {
    const exp = rs(['d'], [[new Date('2026-01-01T00:00:00Z')]]);
    const sameInstant = rs(['d'], [[new Date('2026-01-01T00:00:00Z')]]);
    const different = rs(['d'], [[new Date('2026-01-02T00:00:00Z')]]);
    expect(grade(exp, sameInstant).correct).toBe(true);
    expect(grade(exp, different).correct).toBe(false);
  });
});

describe('diffResults', () => {
  it('reports missing and extra rows (order-insensitive)', () => {
    const d = diffResults(rs(['x'], [[1], [2], [3]]), rs(['x'], [[1], [2], [4]]));
    expect(d.missingRows).toEqual([[3]]);
    expect(d.extraRows).toEqual([[4]]);
    expect(d.columnMismatch).toBe(false);
    expect(d.orderWrong).toBeNull();
  });

  it('flags a column-count mismatch and skips the row diff', () => {
    const d = diffResults(rs(['a', 'b'], [[1, 2]]), rs(['a'], [[1]]));
    expect(d.columnMismatch).toBe(true);
    expect(d.missingRows).toEqual([]);
  });

  it('detects right-rows-wrong-order when orderMatters', () => {
    const d = diffResults(rs(['x'], [[1], [2]]), rs(['x'], [[2], [1]]), { orderMatters: true });
    expect(d.missingRows).toEqual([]);
    expect(d.extraRows).toEqual([]);
    expect(d.orderWrong?.index).toBe(0);
  });
});
