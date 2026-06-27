import type { Cell } from '../grading/types';

export function isNumeric(value: Cell): boolean {
  return typeof value === 'number' || typeof value === 'bigint';
}

export function formatCell(value: Cell): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
