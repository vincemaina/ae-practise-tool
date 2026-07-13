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
  dbtQuery,
  listWarehouseObjects,
  type SourceTable,
  type WarehouseObject,
} from '../engine/duckdb';
import type { ResultSet } from '../grading/types';
import { gradeSubmission, type DbtChallenge, type DbtGradeResult } from '../dbt';
import { ResultsTable } from './ResultsTable';
import { formatCell, isNumeric } from './formatCell';

const INSTRUCTIONS = '__instructions__';
const testId = (s: string) => s.replace(/[^a-z0-9]/gi, '-');

/** A file-tree + tabbed-editor + terminal/SQL mini-IDE for a dbt challenge.
 *  Iterate with `dbt run/build/compile` in the Terminal; query the warehouse in
 *  the SQL console; the Warehouse panel shows what physically exists; Submit
 *  builds the project and grades it against the hidden reference solution. */
interface Saved {
  files?: Record<string, string>;
  folders?: string[];
  history?: string[];
  sqlHistory?: string[];
  term?: string[];
  sidebarWidth?: number;
}

// ---- file tree ------------------------------------------------------------
interface DirNode {
  name: string;
  path: string;
  dirs: DirNode[];
  files: { name: string; path: string }[];
}

/** Build a nested folder tree from full file paths + any explicit empty folders. */
function buildTree(paths: string[], folders: string[]): DirNode {
  const root: DirNode = { name: '', path: '', dirs: [], files: [] };
  const ensureDir = (segments: string[]): DirNode => {
    let node = root;
    let acc = '';
    for (const seg of segments) {
      acc = acc ? `${acc}/${seg}` : seg;
      let child = node.dirs.find((d) => d.name === seg);
      if (!child) {
        child = { name: seg, path: acc, dirs: [], files: [] };
        node.dirs.push(child);
      }
      node = child;
    }
    return node;
  };
  for (const f of folders) ensureDir(f.split('/').filter(Boolean));
  for (const p of paths) {
    const segs = p.split('/');
    const name = segs.pop() ?? p;
    ensureDir(segs).files.push({ name, path: p });
  }
  const sortNode = (n: DirNode) => {
    n.dirs.sort((a, b) => a.name.localeCompare(b.name));
    n.files.sort((a, b) => a.name.localeCompare(b.name));
    n.dirs.forEach(sortNode);
  };
  sortNode(root);
  return root;
}

function FileTree({
  node,
  depth,
  active,
  collapsed,
  confirmDelete,
  onToggleDir,
  onOpen,
  onDelete,
  onCancelDelete,
}: {
  node: DirNode;
  depth: number;
  active: string;
  collapsed: Set<string>;
  confirmDelete: string | null;
  onToggleDir: (path: string) => void;
  onOpen: (path: string) => void;
  onDelete: (path: string) => void;
  onCancelDelete: () => void;
}) {
  const pad = (d: number) => ({ paddingLeft: `${d * 0.85 + 0.5}rem` });
  return (
    <ul className="dbt-filetree">
      {node.dirs.map((d) => (
        <li key={d.path}>
          <button
            className="dbt-dir"
            style={pad(depth)}
            onClick={() => onToggleDir(d.path)}
            data-testid={`tree-dir-${testId(d.path)}`}
          >
            <span className="dbt-dir-caret">{collapsed.has(d.path) ? '▸' : '▾'}</span>
            {d.name}
          </button>
          {!collapsed.has(d.path) && (
            <FileTree
              node={d}
              depth={depth + 1}
              active={active}
              collapsed={collapsed}
              confirmDelete={confirmDelete}
              onToggleDir={onToggleDir}
              onOpen={onOpen}
              onDelete={onDelete}
              onCancelDelete={onCancelDelete}
            />
          )}
        </li>
      ))}
      {node.files.map((f) => {
        const confirming = confirmDelete === f.path;
        return (
          <li key={f.path} className="dbt-file-row">
            <button
              className={`dbt-file ${active === f.path ? 'active' : ''}`}
              style={pad(depth)}
              onClick={() => onOpen(f.path)}
              data-testid={`tree-${testId(f.path)}`}
            >
              {f.name}
            </button>
            <button
              className={`dbt-file-del ${confirming ? 'confirm' : ''}`}
              title={confirming ? 'Click again to delete' : 'Delete'}
              aria-label={'Delete ' + f.path}
              onClick={() => onDelete(f.path)}
              onBlur={() => confirming && onCancelDelete()}
            >
              {confirming ? '✓' : '×'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const OBJ_ICON: Record<WarehouseObject['kind'], string> = { source: '◆', view: '◇', table: '▦' };

export function DbtWorkspace({ challenge, dark }: { challenge: DbtChallenge; dark: boolean }) {
  // Persist the working state (files, folders, history, layout) per challenge so
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
  const [folders, setFolders] = useState<string[]>(() => saved.folders ?? []);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string>(INSTRUCTIONS);
  const [newName, setNewName] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);

  // Bottom drawer: a Terminal (dbt commands) and a SQL console (query warehouse).
  const [bottomTab, setBottomTab] = useState<'terminal' | 'sql'>('terminal');
  const [termOpen, setTermOpen] = useState(true);

  const [term, setTerm] = useState<string[]>(
    () =>
      saved.term ?? [
        'mini-dbt terminal — run dbt commands, e.g. `dbt build` or `dbt compile`.',
        'Use the SQL tab to query your models and sources.',
      ],
  );
  const [cmd, setCmd] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>(() => saved.history ?? []);
  const histIdx = useRef(-1); // -1 = the live input; 0 = most recent, higher = older
  const termRef = useRef<HTMLDivElement>(null);

  const [sqlText, setSqlText] = useState('');
  const [sqlResult, setSqlResult] = useState<ResultSet | null>(null);
  const [sqlErr, setSqlErr] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<string[]>(() => saved.sqlHistory ?? []);
  const sqlHistIdx = useRef(-1);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => saved.sidebarWidth ?? 220);
  const ideRef = useRef<HTMLDivElement>(null);

  const [sources, setSources] = useState<SourceTable[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [objects, setObjects] = useState<WarehouseObject[]>([]);
  const [verdict, setVerdict] = useState<DbtGradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const srcNames = sources?.map((s) => s.name) ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ files, folders, history, sqlHistory, term, sidebarWidth }),
      );
    } catch {
      /* best-effort */
    }
  }, [files, folders, history, sqlHistory, term, sidebarWidth, storageKey]);

  // Tracks the active drag's teardown so it can also run on unmount mid-drag
  // (otherwise the listeners leak and body cursor sticks at col-resize).
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const onMove = (ev: globalThis.MouseEvent) => {
      const left = ideRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(Math.max(150, Math.min(460, ev.clientX - left)));
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      resizeCleanupRef.current = null;
    };
    const onUp = () => cleanup();
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    resizeCleanupRef.current = cleanup;
  }

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  // Seed the terminal's persistent scratch schema once per challenge, grab the
  // source previews (Instructions), and list what's in the warehouse. The schema
  // then survives across `dbt run`/`build` so incremental models rebuild
  // incrementally (feedback #13).
  useEffect(() => {
    let cancelled = false;
    setSourcesError(null);
    dbtInit(challenge.sources)
      .then((s) => {
        if (cancelled) return;
        setSources(s);
        return listWarehouseObjects(s.map((x) => x.name));
      })
      .then((o) => o && !cancelled && setObjects(o))
      .catch((e) => {
        if (cancelled) return;
        setSources([]);
        setSourcesError(`Failed to load the SQL engine: ${String(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [challenge.sources]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [term]);

  const refreshObjects = async () => {
    try {
      setObjects(await listWarehouseObjects(srcNames));
    } catch {
      /* best-effort */
    }
  };

  const openTab = (path: string) => setActive(path);
  const toggleDir = (path: string) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const addFile = (path: string) => {
    const p = path.trim();
    if (!p || files[p] !== undefined) return;
    setFiles((f) => ({ ...f, [p]: '' }));
    openTab(p);
    setNewName(null);
  };
  const addFolder = (path: string) => {
    const p = path.trim().replace(/\/+$/, '');
    if (!p) return;
    setFolders((fs) => (fs.includes(p) ? fs : [...fs, p]));
    setNewFolder(null);
  };
  const deleteFile = (path: string) => {
    setFiles((f) => {
      const rest = { ...f };
      delete rest[path];
      return rest;
    });
    if (active === path) setActive(INSTRUCTIONS);
  };
  // First click arms the confirm state (button turns into a ✓); a second
  // click on the same file actually deletes it (feedback 0008 — no
  // unconfirmed one-click delete).
  const requestDeleteFile = (path: string) => {
    if (confirmDeletePath === path) {
      deleteFile(path);
      setConfirmDeletePath(null);
    } else {
      setConfirmDeletePath(path);
    }
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
      void refreshObjects();
    } catch (e) {
      setTerm((t) => [...t, `error: ${String(e).split('\n')[0]}`]);
    } finally {
      setRunning(false);
    }
  }

  async function runSql(text?: string) {
    const q = (text ?? sqlText).trim();
    if (!q || sqlRunning) return;
    setSqlHistory((h) => (h[h.length - 1] === q ? h : [...h, q]));
    sqlHistIdx.current = -1;
    setSqlRunning(true);
    setSqlErr(null);
    try {
      setSqlResult(await dbtQuery(q));
      void refreshObjects();
    } catch (e) {
      setSqlErr(String(e).split('\n')[0] ?? 'query failed');
      setSqlResult(null);
    } finally {
      setSqlRunning(false);
    }
  }

  // Click a warehouse object → inspect its rows in the SQL console.
  function inspect(name: string) {
    const q = `select * from ${name} limit 50`;
    setSqlText(q);
    setBottomTab('sql');
    setTermOpen(true);
    void runSql(q);
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

  function histRecall(
    e: KeyboardEvent<HTMLInputElement>,
    hist: string[],
    idxRef: { current: number },
    set: (v: string) => void,
  ) {
    if (e.key === 'ArrowUp') {
      if (hist.length === 0) return;
      e.preventDefault();
      idxRef.current = Math.min(idxRef.current + 1, hist.length - 1);
      set(hist[hist.length - 1 - idxRef.current] ?? '');
    } else if (e.key === 'ArrowDown') {
      if (idxRef.current < 0) return;
      e.preventDefault();
      idxRef.current -= 1;
      set(idxRef.current < 0 ? '' : (hist[hist.length - 1 - idxRef.current] ?? ''));
    }
  }

  function onTermKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void run();
    else histRecall(e, history, histIdx, setCmd);
  }
  function onSqlKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void runSql();
    else histRecall(e, sqlHistory, sqlHistIdx, setSqlText);
  }

  const tree = buildTree(Object.keys(files), folders);

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
            <div className="dbt-sidebar-actions">
              <button className="icon-btn" title="New file" onClick={() => setNewName('')} data-testid="dbt-newfile">
                📄+
              </button>
              <button className="icon-btn" title="New folder" onClick={() => setNewFolder('')} data-testid="dbt-newfolder">
                📁+
              </button>
            </div>
          </div>

          <div className="dbt-tree-scroll">
            <button
              className={`dbt-file dbt-instr-link ${active === INSTRUCTIONS ? 'active' : ''}`}
              onClick={() => openTab(INSTRUCTIONS)}
            >
              📄 Instructions
            </button>

            <FileTree
              node={tree}
              depth={0}
              active={active}
              collapsed={collapsed}
              confirmDelete={confirmDeletePath}
              onToggleDir={toggleDir}
              onOpen={openTab}
              onDelete={requestDeleteFile}
              onCancelDelete={() => setConfirmDeletePath(null)}
            />

            {newName !== null && (
              <input
                autoFocus
                className="dbt-newfile-input"
                placeholder="models/new_model.sql"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFile(newName);
                  else if (e.key === 'Escape') setNewName(null);
                }}
                onBlur={() => setNewName(null)}
                data-testid="dbt-newfile-input"
              />
            )}
            {newFolder !== null && (
              <input
                autoFocus
                className="dbt-newfile-input"
                placeholder="macros"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFolder(newFolder);
                  else if (e.key === 'Escape') setNewFolder(null);
                }}
                onBlur={() => setNewFolder(null)}
                data-testid="dbt-newfolder-input"
              />
            )}
          </div>

          <div className="dbt-warehouse" data-testid="dbt-warehouse">
            <span className="section-label">Warehouse</span>
            <ul className="dbt-obj-list">
              {objects.length === 0 && <li className="muted dbt-obj-empty">nothing built yet</li>}
              {objects.map((o) => (
                <li key={o.name}>
                  <button
                    className="dbt-obj"
                    onClick={() => inspect(o.name)}
                    title={`${o.kind} — click to query`}
                    data-testid={`wh-${testId(o.name)}`}
                  >
                    <span className={`dbt-obj-icon ${o.kind}`}>{OBJ_ICON[o.kind]}</span>
                    <span className="dbt-obj-name">{o.name}</span>
                    <span className="dbt-obj-kind">{o.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div
          className="dbt-resizer"
          onMouseDown={startResize}
          role="separator"
          aria-orientation="vertical"
          data-testid="dbt-resizer"
        />

        <div className="dbt-main">
          <div className="dbt-editor-head">
            <span className="dbt-breadcrumb" data-testid="dbt-active-file">
              {active === INSTRUCTIONS ? 'Instructions' : active}
            </span>
            <button className="primary dbt-submit" onClick={submit} disabled={submitting} data-testid="dbt-submit">
              {submitting ? 'Grading…' : 'Submit'}
            </button>
          </div>

          {sourcesError && (
            <div className="dbt-verdict-bar bad" data-testid="error">
              {sourcesError}
            </div>
          )}

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
            <div className="dbt-term-header">
              <div className="dbt-term-tabs">
                <button
                  className={`dbt-term-tab ${bottomTab === 'terminal' ? 'active' : ''}`}
                  onClick={() => {
                    setBottomTab('terminal');
                    setTermOpen(true);
                  }}
                  data-testid="dbt-bottom-tab-terminal"
                >
                  Terminal
                </button>
                <button
                  className={`dbt-term-tab ${bottomTab === 'sql' ? 'active' : ''}`}
                  onClick={() => {
                    setBottomTab('sql');
                    setTermOpen(true);
                  }}
                  data-testid="dbt-bottom-tab-sql"
                >
                  SQL
                </button>
              </div>
              <button
                className="dbt-term-collapse"
                onClick={() => setTermOpen((o) => !o)}
                title={termOpen ? 'Collapse' : 'Expand'}
                data-testid="dbt-term-toggle"
              >
                {termOpen ? '▾' : '▴'}
              </button>
            </div>

            {termOpen && bottomTab === 'terminal' && (
              <>
                <div className="dbt-term-log" ref={termRef} data-testid="dbt-terminal">
                  {term.map((line, i) => (
                    <div key={i} className={line.startsWith('$') ? 'term-cmd' : line.includes('ERROR') ? 'term-err' : ''}>
                      {line || ' '}
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

            {termOpen && bottomTab === 'sql' && (
              <>
                <div className="dbt-sql-results" data-testid="dbt-sql-results">
                  {sqlErr ? (
                    <div className="term-err dbt-sql-err">{sqlErr}</div>
                  ) : sqlResult ? (
                    <div className="results-wrap">
                      <ResultsTable data={sqlResult} />
                    </div>
                  ) : (
                    <div className="muted dbt-sql-hint">
                      Query the warehouse, e.g. <code>select * from {srcNames[0] ?? 'stg_orders'}</code>. Click an
                      object in the Warehouse panel to inspect it.
                    </div>
                  )}
                </div>
                <div className="dbt-term-input">
                  <span className="term-prompt sql">sql&gt;</span>
                  <input
                    value={sqlText}
                    onChange={(e) => setSqlText(e.target.value)}
                    onKeyDown={onSqlKey}
                    placeholder="select * from orders_mart"
                    spellCheck={false}
                    disabled={sqlRunning}
                    data-testid="dbt-sql-input"
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
