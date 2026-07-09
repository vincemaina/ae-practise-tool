import type { ResultSet } from '../grading/types';
import { diffResults, type GradeOptions } from '../grading/grade';
import { ResultsTable } from './ResultsTable';

/** Shows *what* differs between the user's output and the expected output, so an
 *  "Incorrect" becomes a learning moment (no AI needed). */
export function DiffView({
  expected,
  actual,
  grading,
}: {
  expected: ResultSet;
  actual: ResultSet;
  grading: GradeOptions;
}) {
  const diff = diffResults(expected, actual, grading);

  if (diff.columnMismatch && diff.expectedColumns.length !== diff.actualColumns.length) {
    return (
      <div className="diff" data-testid="diff">
        <p className="muted">
          Columns don’t match: expected <strong>{diff.expectedColumns.length}</strong> (
          {diff.expectedColumns.join(', ')}), your query returned{' '}
          <strong>{diff.actualColumns.length}</strong> ({diff.actualColumns.join(', ') || '—'}).
        </p>
      </div>
    );
  }

  const noRowDiff =
    diff.missingRows.length === 0 && diff.extraRows.length === 0 && !diff.orderWrong;

  return (
    <div className="diff" data-testid="diff">
      {diff.columnMismatch && (
        <p className="muted">Column names differ from what’s expected.</p>
      )}
      {diff.orderWrong && (
        <p className="muted">
          Right rows, wrong order — row {diff.orderWrong.index + 1} is where it first differs.
        </p>
      )}
      {diff.missingRows.length > 0 && (
        <div className="diff-block missing">
          <span className="section-label">
            Missing — expected, but not in your output ({diff.missingRows.length})
          </span>
          <div className="results-wrap">
            <ResultsTable data={{ columns: expected.columns, rows: diff.missingRows }} />
          </div>
        </div>
      )}
      {diff.extraRows.length > 0 && (
        <div className="diff-block extra">
          <span className="section-label">
            Extra — in your output, not expected ({diff.extraRows.length})
          </span>
          <div className="results-wrap">
            <ResultsTable data={{ columns: actual.columns, rows: diff.extraRows }} />
          </div>
        </div>
      )}
      {noRowDiff && !diff.columnMismatch && (
        <p className="muted">
          Your rows match the expected set — check column order or this question’s ordering
          requirement.
        </p>
      )}
    </div>
  );
}
