import { describe, it, expect } from 'vitest';
import { statementAt, statementCount, statementForCursor } from './statement';

describe('statementAt', () => {
  it('returns the whole text for a single statement', () => {
    const doc = 'SELECT 1';
    expect(statementAt(doc, 0)?.text).toBe('SELECT 1');
    expect(statementAt(doc, 8)?.text).toBe('SELECT 1');
  });

  it('picks the statement the cursor is inside (multi-statement)', () => {
    const doc = 'SELECT 1;\nSELECT 2;\nSELECT 3';
    expect(statementAt(doc, 3)?.text).toBe('SELECT 1'); // in first
    expect(statementAt(doc, 13)?.text).toBe('SELECT 2'); // in second
    expect(statementAt(doc, doc.length)?.text).toBe('SELECT 3'); // in third
  });

  it('moves to the next statement when the cursor is just after a semicolon', () => {
    const doc = 'SELECT 1;SELECT 2';
    // position 9 is right after the ';'
    expect(statementAt(doc, 9)?.text).toBe('SELECT 2');
  });

  it('trims surrounding whitespace and reports an inner range', () => {
    const doc = 'SELECT 1;\n\n  SELECT 2  ;';
    const s = statementAt(doc, 14);
    expect(s?.text).toBe('SELECT 2');
    expect(doc.slice(s!.from, s!.to)).toBe('SELECT 2');
  });

  it('returns null inside an empty statement', () => {
    expect(statementAt('SELECT 1;   ;SELECT 2', 10)).toBeNull();
  });
});

describe('statementForCursor', () => {
  const doc = 'SELECT a\nFROM t\nWHERE x;\n\nSELECT b\nFROM u;';
  // lines: 0 SELECT a | 1 FROM t | 2 WHERE x; | 3 (empty) | 4 SELECT b | 5 FROM u;

  it('selects the whole multi-line query from any of its lines', () => {
    const first = 'SELECT a\nFROM t\nWHERE x';
    expect(statementForCursor(doc, 0)?.text).toBe(first); // line 0
    expect(statementForCursor(doc, doc.indexOf('FROM t') + 2)?.text).toBe(first); // line 1
    expect(statementForCursor(doc, doc.indexOf('WHERE x') + 3)?.text).toBe(first); // line 2
  });

  it('picks the previous query when the cursor is on an empty line', () => {
    const emptyLinePos = doc.indexOf('WHERE x;') + 'WHERE x;'.length + 1; // the blank line
    expect(statementForCursor(doc, emptyLinePos)?.text).toBe('SELECT a\nFROM t\nWHERE x');
  });

  it('uses the first non-whitespace on an indented line', () => {
    const d = 'SELECT 1;\n   SELECT 2\n   FROM t';
    expect(statementForCursor(d, d.indexOf('FROM t'))?.text).toBe('SELECT 2\n   FROM t');
  });
});

describe('statementCount', () => {
  it('counts non-empty statements', () => {
    expect(statementCount('SELECT 1')).toBe(1);
    expect(statementCount('SELECT 1;')).toBe(1);
    expect(statementCount('SELECT 1; SELECT 2')).toBe(2);
    expect(statementCount('SELECT 1; ; SELECT 2;')).toBe(2);
    expect(statementCount('   ')).toBe(0);
  });
});
