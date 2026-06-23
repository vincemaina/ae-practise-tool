/** A single cell value as returned by the engine. */
export type Cell = string | number | bigint | boolean | Date | null | undefined;

export interface Column {
  name: string;
  /** Engine-reported type label (informational; grading is value-based). */
  type: string;
}

/** A query result: ordered columns + rows of cells (row[i] aligns with columns[i]). */
export interface ResultSet {
  columns: Column[];
  rows: Cell[][];
}
