import type { ResultSet } from '../grading/types';
import { formatCell, isNumeric } from './formatCell';

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
                  formatCell(cell)
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
