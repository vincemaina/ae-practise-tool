import { useMemo, useState } from 'react';
import { allPacks, allConcepts, difficulties, questionConcepts } from '../content';
import type { Difficulty, Question } from '../content/types';
import {
  selectSessionQuestions,
  randomShuffle,
  type SessionPool,
  type SessionOrder,
} from '../session/session';

const SIZES = ['5', '10', '15', 'all'] as const;
type SizeSel = (typeof SIZES)[number];

/**
 * Configure a practice session, then build its queue. A session is a disposable,
 * user-defined run of questions (vs the fixed curated tracks). This panel filters
 * the dialect-scoped questions by pack/concept/difficulty, picks a pool + order +
 * size, shows a live count, and hands the built queue up via `onStart`.
 */
export function SessionSetup({
  questions,
  solvedIds,
  reviewIds,
  onStart,
  onCancel,
}: {
  /** Questions already scoped to the active dialect. */
  questions: Question[];
  solvedIds: string[];
  reviewIds: string[];
  onStart: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [pack, setPack] = useState('all');
  const [concept, setConcept] = useState('all');
  const [diffs, setDiffs] = useState<Difficulty[]>([...difficulties]);
  const [pool, setPool] = useState<SessionPool>('unsolved');
  const [includeSolved, setIncludeSolved] = useState(true);
  const [sizeSel, setSizeSel] = useState<SizeSel>('10');
  const [order, setOrder] = useState<SessionOrder>('sequential');

  const toggleDiff = (d: Difficulty) =>
    setDiffs((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  // Questions matching the scope filters (pack / concept / difficulty).
  const candidates = useMemo(
    () =>
      questions.filter(
        (q) =>
          (pack === 'all' || q.packs.includes(pack)) &&
          (concept === 'all' || questionConcepts(q.id).includes(concept)) &&
          (diffs.length === 0 || diffs.includes(q.difficulty)),
      ),
    [questions, pack, concept, diffs],
  );

  const numericSize = sizeSel === 'all' ? candidates.length : Number(sizeSel);
  const config = { pool, includeSolved, size: numericSize, order };

  // Preview count is order-independent, so compute it with the default (identity)
  // shuffle — the real random order is only applied when Start is pressed.
  const count = useMemo(
    () => selectSessionQuestions(candidates, config, { solvedIds, reviewIds }).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, pool, includeSolved, numericSize, order, solvedIds, reviewIds],
  );

  function start() {
    const ids = selectSessionQuestions(
      candidates,
      config,
      { solvedIds, reviewIds },
      order === 'random' ? randomShuffle : undefined,
    );
    if (ids.length > 0) onStart(ids);
  }

  return (
    <main className="page session-setup-page">
      <div className="list-head">
        <h1 className="page-title">Start a practice session</h1>
        <button className="link-btn" onClick={onCancel} data-testid="session-cancel">
          ← All problems
        </button>
      </div>
      <p className="muted session-intro">
        Build a focused, one-off run of questions — pick what to drill and how many, then work
        through them back to back.
      </p>

      <div className="card session-config">
        <div className="session-field">
          <span className="section-label">Topic</span>
          <div className="session-selects">
            <select value={pack} onChange={(e) => setPack(e.target.value)} aria-label="Pack" data-testid="session-pack">
              <option value="all">All packs</option>
              {allPacks.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              aria-label="Concept"
              data-testid="session-concept"
            >
              <option value="all">All concepts</option>
              {allConcepts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="session-field">
          <span className="section-label">Difficulty</span>
          <div className="session-chips" role="group" aria-label="Difficulty">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip-toggle ${diffs.includes(d) ? 'on' : ''}`}
                aria-pressed={diffs.includes(d)}
                onClick={() => toggleDiff(d)}
                data-testid={`session-diff-${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="session-field">
          <span className="section-label">Draw from</span>
          <div className="session-chips" role="radiogroup" aria-label="Question pool">
            {(
              [
                ['unsolved', 'Unsolved only'],
                ['all', 'All matching'],
                ['review', 'Needs review'],
              ] as [SessionPool, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={pool === id}
                className={`chip-toggle ${pool === id ? 'on' : ''}`}
                onClick={() => setPool(id)}
                data-testid={`session-pool-${id}`}
              >
                {label}
              </button>
            ))}
          </div>
          {pool === 'unsolved' && (
            <label className="session-check">
              <input
                type="checkbox"
                checked={includeSolved}
                onChange={(e) => setIncludeSolved(e.target.checked)}
                data-testid="session-include-solved"
              />
              Top up with solved questions if I run low
            </label>
          )}
        </div>

        <div className="session-field">
          <span className="section-label">Length</span>
          <div className="session-chips" role="radiogroup" aria-label="Session length">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sizeSel === s}
                className={`chip-toggle ${sizeSel === s ? 'on' : ''}`}
                onClick={() => setSizeSel(s)}
                data-testid={`session-size-${s}`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="session-field">
          <span className="section-label">Order</span>
          <div className="session-chips" role="radiogroup" aria-label="Order">
            {(
              [
                ['sequential', 'Easy → hard'],
                ['random', 'Shuffle'],
              ] as [SessionOrder, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={order === id}
                className={`chip-toggle ${order === id ? 'on' : ''}`}
                onClick={() => setOrder(id)}
                data-testid={`session-order-${id}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="session-start-row">
          <span className="muted" data-testid="session-count">
            {count === 0 ? 'No questions match — widen the filters.' : `${count} question${count === 1 ? '' : 's'} in this session`}
          </span>
          <button
            type="button"
            className="primary"
            onClick={start}
            disabled={count === 0}
            data-testid="session-start"
          >
            Start session →
          </button>
        </div>
      </div>
    </main>
  );
}
