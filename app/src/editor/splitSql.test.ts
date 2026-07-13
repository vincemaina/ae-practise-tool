import { describe, it, expect } from 'vitest';
import {
  topLevelSemicolons,
  nextTopLevelSemicolon,
  prevTopLevelSemicolon,
  splitStatements,
  splitStatementRanges,
} from './splitSql';

describe('topLevelSemicolons', () => {
  it('finds semicolons with no literals or comments', () => {
    const sql = 'SELECT 1; SELECT 2;';
    expect(topLevelSemicolons(sql)).toEqual([8, sql.length - 1]);
  });

  it('ignores a `;` inside a single-quoted string', () => {
    const sql = "SELECT REPLACE(status, ';', ',') FROM orders";
    expect(topLevelSemicolons(sql)).toEqual([]);
  });

  it('handles `\'\'` escapes inside a single-quoted string', () => {
    const sql = "SELECT 'it''s; still one string' FROM t;";
    expect(topLevelSemicolons(sql)).toEqual([sql.length - 1]);
  });

  it('ignores a `;` inside a double-quoted identifier', () => {
    const sql = 'SELECT "weird;column" FROM t;';
    expect(topLevelSemicolons(sql)).toEqual([sql.length - 1]);
  });

  it('handles `""` escapes inside a double-quoted identifier', () => {
    const sql = 'SELECT "a""b;c" FROM t;';
    expect(topLevelSemicolons(sql)).toEqual([sql.length - 1]);
  });

  it('ignores a `;` inside a `--` line comment', () => {
    const sql = 'SELECT 1 -- trailing ; comment\nFROM t;';
    expect(topLevelSemicolons(sql)).toEqual([sql.length - 1]);
  });

  it('resumes scanning after a line comment ends', () => {
    const sql = 'SELECT 1 -- comment ;\n;SELECT 2;';
    // the first top-level `;` is the one right after the newline, not the one in the comment
    expect(topLevelSemicolons(sql)).toEqual([sql.indexOf(';', sql.indexOf('\n')), sql.length - 1]);
  });

  it('ignores a `;` inside a `/* */` block comment', () => {
    const sql = 'SELECT 1 /* a; b; c */ ;SELECT 2;';
    const firstSemi = sql.indexOf(';', sql.indexOf('*/'));
    expect(topLevelSemicolons(sql)).toEqual([firstSemi, sql.length - 1]);
  });

  it('handles a multi-line block comment', () => {
    const sql = 'SELECT 1;\n/* still\ncommented; out\n*/\nSELECT 2;';
    expect(topLevelSemicolons(sql)).toEqual([8, sql.length - 1]);
  });

  it('returns no positions when there is no trailing `;`', () => {
    expect(topLevelSemicolons('SELECT 1')).toEqual([]);
  });
});

describe('nextTopLevelSemicolon / prevTopLevelSemicolon', () => {
  const sql = 'SELECT 1; SELECT 2; SELECT 3';
  const secondSemi = sql.indexOf(';', sql.indexOf(';') + 1);

  it('finds the semicolon at or after a position', () => {
    expect(nextTopLevelSemicolon(sql, 0)).toBe(8);
    expect(nextTopLevelSemicolon(sql, 8)).toBe(8);
    expect(nextTopLevelSemicolon(sql, 9)).toBe(secondSemi);
    expect(nextTopLevelSemicolon(sql, secondSemi + 1)).toBe(-1);
  });

  it('finds the semicolon strictly before a position', () => {
    expect(prevTopLevelSemicolon(sql, 0)).toBe(-1);
    expect(prevTopLevelSemicolon(sql, 8)).toBe(-1);
    expect(prevTopLevelSemicolon(sql, 9)).toBe(8);
    expect(prevTopLevelSemicolon(sql, secondSemi + 1)).toBe(secondSemi);
  });

  it('is unaffected by a `;` inside a literal', () => {
    const withLiteral = "SELECT REPLACE(a, ';', 'x') FROM t; SELECT 2";
    expect(nextTopLevelSemicolon(withLiteral, 0)).toBe(withLiteral.indexOf('; SELECT 2'));
    expect(prevTopLevelSemicolon(withLiteral, withLiteral.length)).toBe(
      withLiteral.indexOf('; SELECT 2'),
    );
  });
});

describe('splitStatements / splitStatementRanges', () => {
  it('splits on top-level semicolons, trimming whitespace', () => {
    expect(splitStatements('SELECT 1; \n SELECT 2 ;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('drops empty statements (stray `;;`)', () => {
    expect(splitStatements('SELECT 1;   ;SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('keeps a `;` literal intact as a single statement', () => {
    const sql = "SELECT REPLACE(status, ';', ',') FROM orders";
    expect(splitStatements(sql)).toEqual([sql]);
  });

  it('handles no trailing `;`', () => {
    expect(splitStatements('SELECT 1')).toEqual(['SELECT 1']);
  });

  it('handles an empty document', () => {
    expect(splitStatements('')).toEqual([]);
    expect(splitStatements('   ')).toEqual([]);
  });

  it('reports ranges whose slice matches the trimmed text', () => {
    const sql = 'SELECT 1;\n\n  SELECT 2  ;';
    const ranges = splitStatementRanges(sql);
    expect(ranges).toHaveLength(2);
    for (const r of ranges) {
      expect(sql.slice(r.from, r.to)).toBe(r.text);
    }
    expect(ranges[1]!.text).toBe('SELECT 2');
  });
});
