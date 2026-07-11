import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { duckdbDialect } from '../editor/sqlDialect';
import { buildDbtTarget } from '../engine/duckdb';
import { gradeSubmission, type DbtChallenge, type DbtGradeResult } from '../dbt';
import type { ResultSet } from '../grading/types';
import { ResultsTable } from './ResultsTable';

/** The multi-file dbt modelling environment: edit model files, Build & grade
 *  against the reference solution (output + structural checks). */
export function DbtWorkspace({ challenge, dark }: { challenge: DbtChallenge; dark: boolean }) {
  const paths = useMemo(() => Object.keys(challenge.starter), [challenge]);
  const [files, setFiles] = useState<Record<string, string>>(() => ({ ...challenge.starter }));
  const [active, setActive] = useState(paths[0]!);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<DbtGradeResult | null>(null);
  const [output, setOutput] = useState<ResultSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  const hints = challenge.hints ?? [];
  const shown = showSolution ? challenge.solution : files;

  async function buildAndGrade() {
    setBusy(true);
    setError(null);
    setVerdict(null);
    setOutput(null);
    try {
      const expected = await buildDbtTarget(challenge, challenge.solution);
      const got = await buildDbtTarget(challenge, files);
      setOutput(got);
      setVerdict(
        gradeSubmission(expected, got, {
          grading: challenge.grading,
          checks: challenge.checks,
          files,
        }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page solve-page dbt-page">
      <div className="solve-grid">
        <section className="solve-left">
          <div className="card">
            <div className="problem-head">
              <h2 data-testid="challenge-title">{challenge.title}</h2>
              <span className="badge badge-debug">dbt</span>
            </div>
            <p className="prompt">{challenge.prompt}</p>
          </div>

          {hints.length > 0 && (
            <div className="card hints">
              <div className="card-head">
                <span className="section-label">Hints</span>
                {hintCount < hints.length && (
                  <button onClick={() => setHintCount((n) => n + 1)}>
                    {hintCount === 0 ? 'Show hint' : 'Next hint'}
                  </button>
                )}
              </div>
              {hintCount > 0 ? (
                <ol>
                  {hints.slice(0, hintCount).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
              ) : (
                <p className="muted">Stuck? Reveal hints one at a time.</p>
              )}
            </div>
          )}
        </section>

        <section className="solve-right">
          <div className="editor-toolbar dbt-toolbar">
            <div className="file-tabs" role="tablist">
              {paths.map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={active === p}
                  className={`file-tab ${active === p ? 'active' : ''}`}
                  onClick={() => setActive(p)}
                  data-testid={`file-${p.replace(/[^a-z]/gi, '-')}`}
                >
                  {p.replace(/^models\//, '')}
                </button>
              ))}
            </div>
            <span className="toolbar-right">
              <button onClick={() => setShowSolution((s) => !s)} data-testid="dbt-solution">
                {showSolution ? 'Hide solution' : 'Solution'}
              </button>
              <button className="primary" onClick={buildAndGrade} disabled={busy} data-testid="dbt-build">
                {busy ? 'Building…' : 'Build & grade'}
              </button>
            </span>
          </div>

          <div className="editor-fill">
            <CodeMirror
              key={active + (showSolution ? ':sol' : '')}
              value={shown[active] ?? ''}
              onChange={(v) => !showSolution && setFiles((f) => ({ ...f, [active]: v }))}
              editable={!showSolution}
              extensions={[sql({ dialect: duckdbDialect, upperCaseKeywords: false }), EditorView.lineWrapping]}
              theme={dark ? oneDark : 'light'}
              height="100%"
            />
          </div>

          <div className="output-drawer open dbt-output">
            <div className="drawer-body">
              {error && (
                <div className="error" data-testid="dbt-error">
                  {error}
                </div>
              )}
              {verdict && (
                <div className={`verdict ${verdict.correct ? 'correct' : 'incorrect'}`}>
                  <span className="verdict-icon">{verdict.correct ? '✓' : '✕'}</span>
                  <div>
                    <strong data-testid="dbt-verdict">{verdict.correct ? 'Correct' : 'Incorrect'}</strong>
                    {verdict.reasons.length > 0 && (
                      <ul data-testid="dbt-reasons">
                        {verdict.reasons.map((r, i) => (
                          <li key={i} className="muted">
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {output && (
                <div className="output-section">
                  <div className="card-head">
                    <strong>
                      Built <code>{challenge.target}</code>
                    </strong>
                    <span className="muted">{output.rows.length} row(s)</span>
                  </div>
                  <div className="results-wrap">
                    <ResultsTable data={output} testId="dbt-results" />
                  </div>
                </div>
              )}
              {!error && !verdict && !output && (
                <p className="muted">
                  Edit the model files, then <strong>Build &amp; grade</strong> to run the project.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
