import type { Cell, ResultSet } from '../grading/types';

/**
 * Maps an Arrow query result to our engine-agnostic ResultSet. Kept free of any
 * Vite-only (`?url`) imports so it can run in both the browser engine and Node
 * (the content-verification script / future authoring tests).
 *
 * Structural types so the same code works for DuckDB-Wasm's async and
 * node-blocking Tables (both expose `schema.fields` and `toArray()`).
 */
interface ArrowField {
  name: string;
  type: unknown;
}
interface ArrowTable {
  schema: { fields: readonly ArrowField[] };
  toArray(): Iterable<Record<string, unknown>>;
}

type Converter = (value: unknown) => Cell;

function coerce(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'bigint' ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value;
  }
  // Fallback for nested/struct/list types — stringify for now (ADR 0004).
  return String(value);
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

// DuckDB-Wasm returns TIMESTAMP/DATE as epoch milliseconds (number) and TIME as
// microseconds-since-midnight (bigint). Format them as readable wall-clock
// strings (UTC, since DuckDB timestamps are timezone-naive) for display + grading.
function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}
function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function formatTime(micros: bigint): string {
  const totalSeconds = Number(micros / 1_000_000n);
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

function converterFor(field: ArrowField): Converter {
  const typeName = String(field.type);

  // DuckDB returns DECIMAL as the unscaled integer (e.g. 99.99 -> "9999").
  // Apply the column's scale so values are real numbers for display and grading.
  const scale = (field.type as { scale?: number }).scale;
  if (typeName.startsWith('Decimal') && typeof scale === 'number') {
    const factor = 10 ** scale;
    return (v) => (v == null ? null : Number(v) / factor);
  }
  // Order matters: 'Timestamp' also starts with 'Time', so check it first.
  if (typeName.startsWith('Timestamp')) {
    return (v) => (v == null ? null : formatTimestamp(Number(v)));
  }
  if (typeName.startsWith('Date')) {
    return (v) => (v == null ? null : formatDate(Number(v)));
  }
  if (typeName.startsWith('Time')) {
    return (v) => (v == null ? null : formatTime(typeof v === 'bigint' ? v : BigInt(Math.trunc(Number(v)))));
  }
  return coerce;
}

export function tableToResultSet(table: ArrowTable): ResultSet {
  const fields = table.schema.fields;
  const columns = fields.map((f) => ({ name: f.name, type: String(f.type) }));
  const converters = fields.map((f) => converterFor(f));
  const rows: Cell[][] = [];
  for (const record of table.toArray()) {
    rows.push(fields.map((f, i) => converters[i]!(record[f.name])));
  }
  return { columns, rows };
}
