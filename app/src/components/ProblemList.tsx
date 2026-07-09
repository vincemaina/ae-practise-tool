import { useMemo, useState } from 'react';
import {
  questions,
  allPacks,
  allConcepts,
  difficulties,
  getDataset,
  questionConcepts,
  recommendNext,
  paths,
} from '../content';
import type { Difficulty, Question } from '../content/types';
import { DifficultyBadge } from './DifficultyBadge';

/** Problem-browsing page: a "Needs review" shortcut + curated learning tracks up
 *  top, then a filterable table (pack / concept / difficulty / search). */
export function ProblemList({
  solvedIds,
  reviewIds,
  onOpen,
}: {
  solvedIds: string[];
  reviewIds: string[];
  onOpen: (slug: string) => void;
}) {
  const solved = new Set(solvedIds);
  const review = new Set(reviewIds);
  const [pack, setPack] = useState('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [concept, setConcept] = useState('all');
  const [search, setSearch] = useState('');
  const [trackId, setTrackId] = useState<string | null>(null);

  const isReview = trackId === 'review';
  const track = !isReview && trackId ? (paths.find((p) => p.id === trackId) ?? null) : null;

  const byId = (id: string) => questions.find((q) => q.id === id);

  const base = useMemo<Question[]>(() => {
    if (isReview) return reviewIds.map(byId).filter((q): q is Question => Boolean(q));
    if (track) return track.questionIds.map(byId).filter((q): q is Question => Boolean(q));
    return questions;
  }, [isReview, track, reviewIds]);

  const filtered = useMemo(
    () =>
      base.filter(
        (q) =>
          (pack === 'all' || q.packs.includes(pack)) &&
          (difficulty === 'all' || q.difficulty === difficulty) &&
          (concept === 'all' || questionConcepts(q.id).includes(concept)) &&
          (search.trim() === '' || q.title.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [base, pack, difficulty, concept, search],
  );

  const title = isReview ? 'Needs review' : track ? track.title : 'Problems';
  const total = isReview ? reviewIds.length : track ? track.questionIds.length : questions.length;

  const recommendedId = recommendNext(solvedIds, reviewIds);
  const recommended = recommendedId ? byId(recommendedId) : undefined;

  return (
    <main className="page problem-list-page">
      <div className="list-head">
        <h1 className="page-title">{title}</h1>
        <span className="muted">
          {filtered.length} of {total}
        </span>
      </div>

      {!isReview && !track && recommended && (
        <button
          type="button"
          className="recommend-banner"
          onClick={() => onOpen(recommended.slug)}
          data-testid="recommended"
        >
          <span className="recommend-text">
            <span className="section-label">Recommended next</span>
            <strong>{recommended.title}</strong>
          </span>
          <span className="recommend-cta">Start →</span>
        </button>
      )}

      {isReview || track ? (
        <div className="track-banner">
          <div>
            <p>
              {isReview
                ? 'Questions you attempted but haven’t solved yet — come back and finish them off.'
                : track!.description}
            </p>
            {track && (
              <span className="muted">
                {track.questionIds.filter((id) => solved.has(id)).length}/{track.questionIds.length}{' '}
                solved in this track
              </span>
            )}
          </div>
          <button className="link-btn" onClick={() => setTrackId(null)} data-testid="clear-track">
            ← All problems
          </button>
        </div>
      ) : (
        <div className="tracks">
          {reviewIds.length > 0 && (
            <button
              type="button"
              className="track-card review-card"
              onClick={() => setTrackId('review')}
              data-testid="track-review"
            >
              <strong>↻ Needs review</strong>
              <span className="muted track-desc">Attempted but not yet solved.</span>
              <span className="track-progress muted">{reviewIds.length} to review</span>
            </button>
          )}
          {paths.map((p) => {
            const done = p.questionIds.filter((id) => solved.has(id)).length;
            const pct = Math.round((done / p.questionIds.length) * 100);
            return (
              <button
                key={p.id}
                type="button"
                className="track-card"
                onClick={() => setTrackId(p.id)}
                data-testid={`track-${p.id}`}
              >
                <strong>{p.title}</strong>
                <span className="muted track-desc">{p.description}</span>
                <span className="track-progress muted">
                  {done}/{p.questionIds.length}
                </span>
                <div className="track-bar">
                  <div className="track-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="list-controls">
        <input
          className="search"
          type="search"
          placeholder="Search problems…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search problems"
          data-testid="search"
        />
        <select
          value={pack}
          onChange={(e) => setPack(e.target.value)}
          aria-label="Filter by pack"
          data-testid="filter-pack"
        >
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
          aria-label="Filter by concept"
          data-testid="filter-concept"
        >
          <option value="all">All concepts</option>
          {allConcepts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')}
          aria-label="Filter by difficulty"
          data-testid="filter-difficulty"
        >
          <option value="all">All levels</option>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <table className="problem-table">
        <thead>
          <tr>
            <th className="col-status" aria-label="Status" />
            <th className="col-num">#</th>
            <th>Title</th>
            <th className="col-dataset">Dataset</th>
            <th className="col-diff">Difficulty</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q, i) => {
            const done = solved.has(q.id);
            const needsReview = !done && review.has(q.id);
            return (
              <tr
                key={q.id}
                className="problem-row"
                onClick={() => onOpen(q.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(q.slug);
                }}
                tabIndex={0}
                role="link"
                data-testid={`q-${q.slug}`}
              >
                <td className="col-status">
                  <span
                    className={`status ${done ? 'done' : needsReview ? 'review' : ''}`}
                    aria-label={done ? 'solved' : needsReview ? 'needs review' : ''}
                  >
                    {done ? '✓' : needsReview ? '↻' : ''}
                  </span>
                </td>
                <td className="col-num muted">{i + 1}</td>
                <td className="problem-title-cell">{q.title}</td>
                <td className="col-dataset muted">{getDataset(q.datasetId).title}</td>
                <td className="col-diff">
                  <DifficultyBadge difficulty={q.difficulty} />
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                No problems match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
