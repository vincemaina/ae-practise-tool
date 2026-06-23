import type { Cell, ResultSet } from '../grading/types';

function isNumeric(value: Cell): boolean {
  return typeof value === 'number' || typeof value === 'bigint';
}

function format(value: Cell): string {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function ResultsTable({ data, testId }: { data: ResultSet; testId?: string }) {
  return (
    <table className="results-table" data-testid={testId}>
      <thead>
        <tr>
          {data.columns.map((c, i) => (
            <th key={i}>{c.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className={isNumeric(cell) ? 'num' : undefined}>
                {cell === null || cell === undefined ? (
                  <span className="null">NULL</span>
                ) : (
                  format(cell)
                )}
              </td>
            ))}
          </tr>
        ))}
        {data.rows.length === 0 && (
          <tr>
            <td colSpan={Math.max(1, data.columns.length)} className="muted">
              (no rows)
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
