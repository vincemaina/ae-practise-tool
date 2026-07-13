import { useEffect, useMemo, useState } from 'react';
import type { SQLNamespace } from '@codemirror/lang-sql';
import confetti from 'canvas-confetti';
import { getDataset, getMetrics } from '../content';
import { metricTags } from '../content/metrics';
import { buildMessinessSql } from '../content/messiness';
import { DIALECT_OPTIONS, type DialectFilter } from '../content/dialects';
import { logEvent } from '../dev/telemetry';
import type { Question } from '../content/types';
import { ensureDataset, runQuery, validateSql } from '../engine/duckdb';
import { grade, type GradeResult } from '../grading/grade';
import { checkRequiredConstruct } from '../grading/requireConstruct';
import type { ResultSet } from '../grading/types';
import { ResultsTable } from './ResultsTable';
import { SqlEditor } from './SqlEditor';
import { SqlBlock } from './SqlBlock';
import { SchemaPreview } from './SchemaPreview';
import { DifficultyBadge } from './DifficultyBadge';
import { DiffView } from './DiffView';

/** Strip the common leading indentation from a template-literal SQL string. */
function dedent(text: string): string {
  const lines = text.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

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
function formatTime(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function PracticeView({
  question,
  onAttempt,
  onNext,
  nextLabel = 'Next recommended →',
  dark,
  dialect,
}: {
  question: Question;
  onAttempt: (id: string, correct: boolean) => void;
  onNext: () => void;
  nextLabel?: string;
  dark: boolean;
  dialect: DialectFilter;
}) {
  // Which dialect the user writes in (transpiled to DuckDB before running, ADR 0006):
  //  - a dialect-specific question (not tagged 'generic') is always written in its
  //    dialect — honour the user's pick if it's one the question supports, else the first;
  //  - a portable question uses the user's selected dialect ('all' → generic).
  const qDialects = question.dialects;
  const writingDialect: DialectFilter = qDialects.includes('generic')
    ? dialect === 'all'
      ? 'generic'
      : dialect
    : dialect !== 'all' && qDialects.includes(dialect as (typeof qDialects)[number])
      ? dialect
      : qDialects[0]!;
  const dialectLabel = DIALECT_OPTIONS.find((d) => d.id === writingDialect)?.label ?? 'Standard SQL';
  const dataset = getDataset(question.datasetId);
  const canonicalSql = dedent(question.canonical.generic ?? '');
  const isDebug = question.challengeType === 'debug';
  const starter = isDebug && question.starterSql ? dedent(question.starterSql) : '';
  const schema = useMemo<SQLNamespace>(
    () => Object.fromEntries(dataset.tables.map((t) => [t.name, t.columns])),
    [dataset],
  );

  const [ready, setReady] = useState(false);
  const [sql, setSql] = useState(starter);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [activeSql, setActiveSql] = useState('');
  const [results, setResults] = useState<ResultSet | null>(null);
  const [expected, setExpected] = useState<ResultSet | null>(null);
  const [verdict, setVerdict] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // True when the rows matched but the question's required construct was missing —
  // used to suppress the (empty) row-diff for that case.
  const [constructFail, setConstructFail] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Params for (re-)seeding this question's dataset — shared by the initial
  // load and by `getExpected`'s pre-grading re-seed below.
  function seedOpts() {
    return {
      messinessSql: question.messiness ? buildMessinessSql(question.messiness) : undefined,
      variant: question.messiness ? JSON.stringify(question.messiness) : undefined,
    };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureDataset(dataset.id, dataset.setupSql, seedOpts());
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(`Failed to load the SQL engine: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.id, dataset.setupSql, question.messiness]);

  useEffect(() => {
    logEvent('question_view', { questionId: question.id, detail: { slug: question.slug } });
  }, [question.id, question.slug]);

  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  // The query that Run/Submit act on: the statement at the cursor, else the whole doc.
  const queryToRun = (activeSql.trim() ? activeSql : sql).trim();

  async function getExpected(): Promise<ResultSet> {
    // Re-seed first: user SQL (Run, or an earlier Submit) may have mutated the
    // shared dataset (UPDATE/DELETE/DROP/…). `ensureDataset` only actually
    // re-runs the setup SQL when the engine flagged a possible mutation (a
    // harmless no-op otherwise), so this keeps both a fresh `expected` and the
    // table the submitted query is about to run against in sync (issue 0001).
    // A `expected` cached from before the mutation is still valid post-reseed —
    // the canonical solution's output over a freshly-reseeded table is the same
    // deterministic result — so it's safe to keep the cache.
    await ensureDataset(dataset.id, dataset.setupSql, seedOpts());
    if (expected) return expected;
    const exp = await runQuery(canonicalSql);
    setExpected(exp);
    return exp;
  }

  async function handleRun(explicit?: string) {
    const q = (explicit ?? queryToRun).trim();
    if (!q) return;
    setError(null);
    setVerdict(null);
    setBusy(true);
    setDrawerOpen(true);
    try {
      const rs = await runQuery(q, writingDialect);
      setResults(rs);
      logEvent('run', { questionId: question.id, detail: { ok: true, rows: rs.rows.length } });
    } catch (e) {
      setResults(null);
      setError(String(e));
      logEvent('run', { questionId: question.id, detail: { ok: false, error: String(e) } });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!queryToRun) return;
    setError(null);
    setBusy(true);
    setDrawerOpen(true);
    try {
      const exp = await getExpected();
      const got = await runQuery(queryToRun, writingDialect);
      setResults(got);
      const graded = grade(exp, got, question.grading);
      // Showcase questions can also require a specific construct in the SQL you
      // wrote — the rows matching isn't enough (ADR 0004 update). Only applies
      // when the output was otherwise correct; a wrong result shows the normal diff.
      const missingConstruct = graded.correct
        ? checkRequiredConstruct(queryToRun, question.requires)
        : null;
      const result: GradeResult = missingConstruct
        ? { correct: false, reasons: [missingConstruct] }
        : graded;
      setConstructFail(Boolean(missingConstruct));
      setVerdict(result);
      logEvent('submit', {
        questionId: question.id,
        detail: { correct: result.correct, reasons: result.reasons },
      });
      onAttempt(question.id, result.correct);
      if (result.correct) {
        setTimerRunning(false);
        celebrate();
      }
    } catch (e) {
      setVerdict(null);
      setResults(null); // don't leave a previous Run's results under the error
      setError(String(e));
      logEvent('submit', { questionId: question.id, detail: { error: String(e) } });
    } finally {
      setBusy(false);
    }
  }

  async function handleReveal() {
    setBusy(true);
    setDrawerOpen(true);
    logEvent('reveal', { questionId: question.id });
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
  const canRun = ready && !busy && queryToRun.length > 0;

  const hasOutput = error || verdict || results || revealed;
  const status = error
    ? { label: 'Error', cls: 'danger' }
    : verdict
      ? { label: verdict.correct ? 'Correct' : 'Incorrect', cls: verdict.correct ? 'ok' : 'danger' }
      : results
        ? { label: `${results.rows.length} row(s)`, cls: 'muted' }
        : { label: 'Output', cls: 'muted' };

  return (
    <div className="solve-grid">
      {/* Problem panel */}
      <section className="solve-left">
        <div className="card">
          <div className="problem-head">
            <h2 data-testid="question-title">{question.title}</h2>
            <div className="head-badges">
              {isDebug && <span className="badge badge-debug">🐞 Debug</span>}
              <DifficultyBadge difficulty={question.difficulty} />
            </div>
          </div>
          <p className="prompt">{question.prompt}</p>
          {(() => {
            const metrics = getMetrics(question.id);
            return metrics ? (
              <div className="metric-chips" data-testid="metric-chips">
                {metricTags(metrics).map((t) => (
                  <span key={t} className="pill">
                    {t}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
        </div>

        <SchemaPreview dataset={dataset} ready={ready} />

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

      {/* Worksheet panel */}
      <section className="solve-right">
        <div className="editor-toolbar">
          <button data-testid="run" onClick={() => void handleRun()} disabled={!canRun}>
            Run
          </button>
          <button className="primary" data-testid="submit" onClick={handleSubmit} disabled={!canRun}>
            Submit
          </button>
          <button data-testid="reveal" onClick={handleReveal} disabled={!ready || busy}>
            Reveal solution
          </button>
          <span className="toolbar-right">
            {writingDialect !== 'generic' && (
              <span
                className="dialect-chip"
                data-testid="dialect-chip"
                title={`Write ${dialectLabel} — it's translated to run on the engine`}
              >
                {dialectLabel}
              </span>
            )}
            <span
              className={`timer ${seconds >= 600 ? 'danger' : seconds >= 300 ? 'warn' : ''}`}
              data-testid="timer"
              title="Time on this question"
            >
              ⏱ {formatTime(seconds)}
            </span>
            {ready ? (
              <span className="run-hint muted">⌘/Ctrl+Enter</span>
            ) : (
              <span className="run-hint muted engine-loading">
                <span className="spinner spinner-sm" /> Starting engine…
              </span>
            )}
          </span>
        </div>

        <div className="editor-fill">
          <SqlEditor
            fill
            value={sql}
            onChange={setSql}
            onActiveStatement={setActiveSql}
            onRun={(stmt) => {
              if (ready && !busy) void handleRun(stmt);
            }}
            schema={schema}
            readOnly={!ready || busy}
            validate={ready ? (s) => validateSql(s, writingDialect) : undefined}
            placeholder={ready ? 'Write SQL here… run multiple queries; ⌘/Ctrl+Enter runs the one at your cursor.' : 'Loading SQL engine…'}
            dark={dark}
          />
        </div>

        <div className={`output-drawer ${drawerOpen ? 'open' : ''}`}>
          <button
            className="drawer-header"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-expanded={drawerOpen}
            data-testid="drawer-toggle"
          >
            <span className="drawer-title">
              Output
              {hasOutput && <span className={`status-chip ${status.cls}`}>{status.label}</span>}
            </span>
            <span className="drawer-caret" aria-hidden="true">
              {drawerOpen ? '▾' : '▴'}
            </span>
          </button>

          {drawerOpen && (
            <div className="drawer-body">
              {error && (
                <div className="error" data-testid="error">
                  {error}
                </div>
              )}

              {verdict && (
                <div className={`verdict ${verdict.correct ? 'correct' : 'incorrect'}`}>
                  <span className="verdict-icon">{verdict.correct ? '✓' : '✕'}</span>
                  <div>
                    <strong data-testid="verdict">{verdict.correct ? 'Correct' : 'Incorrect'}</strong>
                    {verdict.correct ? (
                      <div className="verdict-correct">
                        <span className="muted">
                          Solved in {formatTime(seconds)}. Nice — that matches the expected output.
                        </span>
                        <button className="link-btn" onClick={onNext} data-testid="next-recommended">
                          {nextLabel}
                        </button>
                      </div>
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

              {verdict && !verdict.correct && !constructFail && expected && results && (
                <div className="output-section">
                  <span className="section-label">What’s different</span>
                  <DiffView expected={expected} actual={results} grading={question.grading} />
                </div>
              )}

              {results && (
                <div className="output-section">
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
                <div className="output-section">
                  <div className="card-head">
                    <strong>Expected output</strong>
                    {expected && <span className="muted">{expected.rows.length} row(s)</span>}
                  </div>
                  {expected && (
                    <div className="results-wrap">
                      <ResultsTable data={expected} testId="expected" />
                    </div>
                  )}
                  <span className="section-label" style={{ display: 'block', margin: '0.8rem 0 0.3rem' }}>
                    Canonical solution
                  </span>
                  <SqlBlock code={canonicalSql} dark={dark} testId="canonical" />
                </div>
              )}

              {!hasOutput && <p className="muted">Run a query to see its output here.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
