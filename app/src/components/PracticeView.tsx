import { useEffect, useMemo, useState } from 'react';
import type { SQLNamespace } from '@codemirror/lang-sql';
import confetti from 'canvas-confetti';
import { getDataset } from '../content';
import type { Question } from '../content/types';
import { ensureDataset, runQuery, validateSql } from '../engine/duckdb';
import { grade, type GradeResult } from '../grading/grade';
import type { ResultSet } from '../grading/types';
import { ResultsTable } from './ResultsTable';
import { SqlEditor } from './SqlEditor';
import { DifficultyBadge } from './DifficultyBadge';

function celebrate() {
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 38,
    origin: { y: 0.7 },
    disableForReducedMotion: true,
    scalar: 0.9,
  });
}

/** The practice loop for a single question. Mount with `key={question.id}` so
 *  switching questions resets editor/results/verdict state automatically. */
export function PracticeView({
  question,
  onSolved,
  dark,
}: {
  question: Question;
  onSolved: (id: string) => void;
  dark: boolean;
}) {
  const dataset = getDataset(question.datasetId);
  const canonicalSql = (question.canonical.generic ?? '').trim();
  const schema = useMemo<SQLNamespace>(
    () => Object.fromEntries(dataset.tables.map((t) => [t.name, t.columns])),
    [dataset],
  );

  const [ready, setReady] = useState(false);
  const [sql, setSql] = useState('');
  const [results, setResults] = useState<ResultSet | null>(null);
  const [expected, setExpected] = useState<ResultSet | null>(null);
  const [verdict, setVerdict] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureDataset(dataset.id, dataset.setupSql);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(`Failed to load the SQL engine: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset.id, dataset.setupSql]);

  async function getExpected(): Promise<ResultSet> {
    if (expected) return expected;
    const exp = await runQuery(canonicalSql);
    setExpected(exp);
    return exp;
  }

  async function handleRun() {
    setError(null);
    setVerdict(null);
    setBusy(true);
    try {
      setResults(await runQuery(sql));
    } catch (e) {
      setResults(null);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      const exp = await getExpected();
      const got = await runQuery(sql);
      setResults(got);
      const result = grade(exp, got, question.grading);
      setVerdict(result);
      if (result.correct) {
        onSolved(question.id);
        celebrate();
      }
    } catch (e) {
      setVerdict(null);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReveal() {
    setBusy(true);
    try {
      await getExpected();
      setRevealed(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const hints = question.hints ?? [];
  const canSubmit = ready && !busy && sql.trim().length > 0;

  return (
    <div className="split">
      {/* Problem panel */}
      <section className="problem">
        <div className="card">
          <div className="problem-head">
            <h2 data-testid="question-title">{question.title}</h2>
            <DifficultyBadge difficulty={question.difficulty} />
          </div>
          <div className="pills">
            {question.packs.map((p) => (
              <span key={p} className="pill">
                {p}
              </span>
            ))}
          </div>
          <p className="prompt">{question.prompt}</p>
        </div>

        <div className="card schema">
          <span className="section-label">Schema · {dataset.title}</span>
          <ul>
            {dataset.tables.map((t) => (
              <li key={t.name}>
                <code>
                  {t.name}({t.columns.join(', ')})
                </code>
              </li>
            ))}
          </ul>
        </div>

        {hints.length > 0 && (
          <div className="card hints">
            <div className="card-head">
              <span className="section-label">Hints</span>
              {hintCount < hints.length && (
                <button data-testid="hint" onClick={() => setHintCount((n) => n + 1)} disabled={busy}>
                  {hintCount === 0 ? 'Show hint' : 'Next hint'}
                </button>
              )}
            </div>
            {hintCount > 0 ? (
              <ol data-testid="hints">
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

      {/* Work panel */}
      <section className="work">
        <div className="card">
          <SqlEditor
            value={sql}
            onChange={setSql}
            onRun={() => {
              if (canSubmit) void handleRun();
            }}
            schema={schema}
            readOnly={!ready || busy}
            validate={ready ? validateSql : undefined}
            placeholder={ready ? 'Write your SQL here…' : 'Loading SQL engine…'}
            dark={dark}
          />
          <div className="actions">
            <button data-testid="run" onClick={handleRun} disabled={!canSubmit}>
              Run
            </button>
            <button className="primary" data-testid="submit" onClick={handleSubmit} disabled={!canSubmit}>
              Submit
            </button>
            <button data-testid="reveal" onClick={handleReveal} disabled={!ready || busy}>
              Reveal solution
            </button>
            <span className="run-hint muted">⌘/Ctrl + Enter</span>
          </div>
        </div>

        {!ready && !error && (
          <div className="card loading">
            <div className="spinner" />
            <div>
              <strong>Starting the in-browser SQL engine…</strong>
              <p className="muted">
                DuckDB runs locally in your browser — no server. First load fetches the engine once.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="card">
            <div className="error" data-testid="error">
              {error}
            </div>
          </div>
        )}

        {verdict && (
          <div className={`verdict ${verdict.correct ? 'correct' : 'incorrect'}`}>
            <span className="verdict-icon">{verdict.correct ? '✓' : '✕'}</span>
            <div>
              <strong data-testid="verdict">{verdict.correct ? 'Correct' : 'Incorrect'}</strong>
              {verdict.correct ? (
                <span className="muted">Nice — that matches the expected output.</span>
              ) : (
                verdict.reasons.length > 0 && (
                  <ul data-testid="reasons">
                    {verdict.reasons.map((r, i) => (
                      <li key={i} className="muted">
                        {r}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="card">
            <div className="card-head">
              <strong>Your results</strong>
              <span className="muted">{results.rows.length} row(s)</span>
            </div>
            <div className="results-wrap">
              <ResultsTable data={results} testId="results" />
            </div>
          </div>
        )}

        {revealed && (
          <div className="card">
            <div className="card-head">
              <strong>Expected output</strong>
              {expected && <span className="muted">{expected.rows.length} row(s)</span>}
            </div>
            {expected && (
              <div className="results-wrap">
                <ResultsTable data={expected} testId="expected" />
              </div>
            )}
            <span className="section-label" style={{ display: 'block', marginTop: '0.8rem' }}>
              Canonical solution
            </span>
            <pre className="canonical">
              <code data-testid="canonical">{canonicalSql}</code>
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
