import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { duckdbDialect } from '../editor/sqlDialect';
import {
  buildDbtTarget,
  dbtRunCommand,
  dbtInit,
  type SourceTable,
} from '../engine/duckdb';
import { gradeSubmission, type DbtChallenge, type DbtGradeResult } from '../dbt';
import { formatCell, isNumeric } from './formatCell';

const INSTRUCTIONS = '__instructions__';

/** A file-tree + tabbed-editor + terminal mini-IDE for a dbt challenge. Iterate
 *  with `dbt run/build/compile` in the terminal; Submit builds the project and
 *  grades it (output + structural) against the hidden reference solution. */
interface Saved {
  files?: Record<string, string>;
  history?: string[];
  term?: string[];
  sidebarWidth?: number;
}

export function DbtWorkspace({ challenge, dark }: { challenge: DbtChallenge; dark: boolean }) {
  // Persist the working state (files, history, terminal, layout) per challenge so
  // it survives reloads (feedback #12). Mounted with key={challenge.id} in App, so
  // these initializers run fresh per challenge.
  const storageKey = `ae-practice:dbt:${challenge.id}`;
  const [saved] = useState<Saved>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Saved) : {};
    } catch {
      return {};
    }
  });

  const [files, setFiles] = useState<Record<string, string>>(() => saved.files ?? { ...challenge.starter });
  const [openTabs, setOpenTabs] = useState<string[]>([INSTRUCTIONS, ...Object.keys(files)]);
  const [active, setActive] = useState<string>(INSTRUCTIONS);
  const [newName, setNewName] = useState<string | null>(null);

  const [term, setTerm] = useState<string[]>(
    () =>
      saved.term ?? [
        'mini-dbt terminal — try `dbt build` or `dbt compile`.',
        'Run SQL against your models to inspect them, e.g. `select * from stg_orders limit 10`.',
      ],
  );
  const [cmd, setCmd] = useState('');
  const [running, setRunning] = useState(false);
  const [termOpen, setTermOpen] = useState(true);
  const [history, setHistory] = useState<string[]>(() => saved.history ?? []);
  const histIdx = useRef(-1); // -1 = the live input; 0 = most recent, higher = older
  const termRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => saved.sidebarWidth ?? 220);
  const ideRef = useRef<HTMLDivElement>(null);

  const [sources, setSources] = useState<SourceTable[] | null>(null);
  const [verdict, setVerdict] = useState<DbtGradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ files, history, term, sidebarWidth }));
    } catch {
      /* best-effort */
    }
  }, [files, history, term, sidebarWidth, storageKey]);

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const onMove = (ev: globalThis.MouseEvent) => {
      const left = ideRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(Math.max(150, Math.min(460, ev.clientX - left)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Seed the terminal's persistent scratch schema once per challenge, and grab
  // the source previews for Instructions. The schema then survives across
  // `dbt run`/`build` so incremental models rebuild incrementally (feedback #13).
  useEffect(() => {
    let cancelled = false;
    dbtInit(challenge.sources)
      .then((s) => !cancelled && setSources(s))
      .catch(() => !cancelled && setSources([]));
    return () => {
      cancelled = true;
    };
  }, [challenge.sources]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [term]);

  const openTab = (path: string) => {
    setOpenTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActive(path);
  };
  const closeTab = (path: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== path);
      if (active === path) setActive(next[next.length - 1] ?? INSTRUCTIONS);
      return next;
    });
  };
  const addFile = (path: string) => {
    const p = path.trim();
    if (!p || files[p] !== undefined) return;
    setFiles((f) => ({ ...f, [p]: '' }));
    openTab(p);
    setNewName(null);
  };
  const deleteFile = (path: string) => {
    setFiles((f) => {
      const rest = { ...f };
      delete rest[path];
      return rest;
    });
    closeTab(path);
  };

  async function run() {
    const c = cmd.trim();
    if (!c || running) return;
    setHistory((h) => (h[h.length - 1] === c ? h : [...h, c]));
    histIdx.current = -1;
    setTerm((t) => [...t, `$ ${c}`]);
    setCmd('');
    setRunning(true);
    try {
      const res = await dbtRunCommand(c, files);
      setTerm((t) => [...t, ...res.lines]);
    } catch (e) {
      setTerm((t) => [...t, `error: ${String(e).split('\n')[0]}`]);
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const expected = await buildDbtTarget(challenge, challenge.solution);
      const got = await buildDbtTarget(challenge, files);
      const v = gradeSubmission(expected, got, {
        grading: challenge.grading,
        checks: challenge.checks,
        files,
      });
      setVerdict(v);
    } catch (e) {
      setVerdict({ correct: false, reasons: [`Build failed: ${String(e).split('\n')[0]}`] });
    } finally {
      setSubmitting(false);
    }
  }

  const tabLabel = (t: string) => (t === INSTRUCTIONS ? 'Instructions' : t.replace(/^models\//, ''));

  function onTermKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void run();
    } else if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      histIdx.current = Math.min(histIdx.current + 1, history.length - 1);
      setCmd(history[history.length - 1 - histIdx.current] ?? '');
    } else if (e.key === 'ArrowDown') {
      if (histIdx.current < 0) return;
      e.preventDefault();
      histIdx.current -= 1;
      setCmd(histIdx.current < 0 ? '' : (history[history.length - 1 - histIdx.current] ?? ''));
    }
  }

  return (
    <main className="page dbt-ide-page">
      <div
        className="dbt-ide"
        ref={ideRef}
        style={{ gridTemplateColumns: `${sidebarWidth}px 5px minmax(0, 1fr)` }}
      >
        <aside className="dbt-sidebar">
          <div className="dbt-sidebar-head">
            <span className="section-label">Project</span>
            <button className="icon-btn" title="New file" onClick={() => setNewName('')} data-testid="dbt-newfile">
              +
            </button>
          </div>
          <ul className="dbt-filetree">
            <li>
              <button
                className={`dbt-file ${active === INSTRUCTIONS ? 'active' : ''}`}
                onClick={() => openTab(INSTRUCTIONS)}
              >
                📄 Instructions
              </button>
            </li>
            {Object.keys(files)
              .sort()
              .map((p) => (
                <li key={p} className="dbt-file-row">
                  <button
                    className={`dbt-file ${active === p ? 'active' : ''}`}
                    onClick={() => openTab(p)}
                    data-testid={`tree-${p.replace(/[^a-z]/gi, '-')}`}
                  >
                    {p}
                  </button>
                  <button className="dbt-file-del" title="Delete" onClick={() => deleteFile(p)}>
                    ×
                  </button>
                </li>
              ))}
            {newName !== null && (
              <li>
                <input
                  autoFocus
                  className="dbt-newfile-input"
                  placeholder="models/new_model.sql"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addFile(newName)}
                  onBlur={() => (newName ? addFile(newName) : setNewName(null))}
                  data-testid="dbt-newfile-input"
                />
              </li>
            )}
          </ul>
        </aside>

        <div
          className="dbt-resizer"
          onMouseDown={startResize}
          role="separator"
          aria-orientation="vertical"
          data-testid="dbt-resizer"
        />

        <div className="dbt-main">
          <div className="dbt-tabbar">
            <div className="file-tabs">
              {openTabs.map((t) => (
                <span key={t} className={`file-tab ${active === t ? 'active' : ''}`}>
                  <button className="file-tab-btn" onClick={() => setActive(t)} data-testid={`tab-${t.replace(/[^a-z]/gi, '-')}`}>
                    {tabLabel(t)}
                  </button>
                  {t !== INSTRUCTIONS && (
                    <button className="file-tab-x" onClick={() => closeTab(t)}>
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <button className="primary dbt-submit" onClick={submit} disabled={submitting} data-testid="dbt-submit">
              {submitting ? 'Grading…' : 'Submit'}
            </button>
          </div>

          {verdict && (
            <div className={`dbt-verdict-bar ${verdict.correct ? 'ok' : 'bad'}`} data-testid="dbt-verdict">
              <strong>{verdict.correct ? '✓ Correct' : '✗ Incorrect'}</strong>
              {verdict.reasons.length > 0 && (
                <ul data-testid="dbt-reasons">
                  {verdict.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dbt-editor-area">
            {active === INSTRUCTIONS ? (
              <Instructions challenge={challenge} sources={sources} />
            ) : (
              <CodeMirror
                key={active}
                value={files[active] ?? ''}
                onChange={(v) => setFiles((f) => ({ ...f, [active]: v }))}
                extensions={[sql({ dialect: duckdbDialect, upperCaseKeywords: false }), EditorView.lineWrapping]}
                theme={dark ? oneDark : 'light'}
                height="100%"
              />
            )}
          </div>

          <div className={`dbt-terminal ${termOpen ? 'open' : ''}`}>
            <button className="dbt-term-header" onClick={() => setTermOpen((o) => !o)} data-testid="dbt-term-toggle">
              <span>Terminal</span>
              <span className="dbt-term-caret">{termOpen ? '▾' : '▴'}</span>
            </button>
            {termOpen && (
              <>
            <div className="dbt-term-log" ref={termRef} data-testid="dbt-terminal">
              {term.map((line, i) => (
                <div key={i} className={line.startsWith('$') ? 'term-cmd' : line.includes('ERROR') ? 'term-err' : ''}>
                  {line || ' '}
                </div>
              ))}
            </div>
            <div className="dbt-term-input">
              <span className="term-prompt">$</span>
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={onTermKey}
                placeholder="dbt build"
                spellCheck={false}
                disabled={running}
                data-testid="dbt-terminal-input"
              />
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Instructions({ challenge, sources }: { challenge: DbtChallenge; sources: SourceTable[] | null }) {
  return (
    <div className="dbt-instructions">
      <h2 data-testid="challenge-title">{challenge.title}</h2>
      <p className="prompt">{challenge.prompt}</p>

      {challenge.hints && challenge.hints.length > 0 && (
        <details className="dbt-hints">
          <summary>Hints</summary>
          <ol>
            {challenge.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </details>
      )}

      <span className="section-label">Source data</span>
      {!sources && <p className="muted">Loading source data…</p>}
      {sources?.map((t) => (
        <div key={t.name} className="schema-table">
          <div className="schema-line">
            <span className="schema-tname mono">{t.name}</span>
            <span className="schema-cols mono">{t.columns.map((c) => c.name).join(', ')}</span>
          </div>
          <div className="results-wrap schema-sample">
            <table className="results-table">
              <thead>
                <tr>
                  {t.columns.map((c, i) => (
                    <th key={i}>
                      <span className="col-name">{c.name}</span>
                      {c.type && <span className="col-type">{c.type.toLowerCase()}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={isNumeric(cell) ? 'num' : undefined}>
                        {cell === null || cell === undefined ? <span className="null">NULL</span> : formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
