import { useMemo, useState } from 'react';
import { questions, allPacks, difficulties, getDataset } from '../content';
import type { Difficulty } from '../content/types';
import { DifficultyBadge } from './DifficultyBadge';

/** The dedicated problem-browsing page (LeetCode-style table). Clicking a row
 *  opens the separate solve screen. Packs stay metadata (filter only), not shown
 *  per-row as a clue. */
export function ProblemList({
  solvedIds,
  onOpen,
}: {
  solvedIds: string[];
  onOpen: (slug: string) => void;
}) {
  const solved = new Set(solvedIds);
  const [pack, setPack] = useState('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      questions.filter(
        (q) =>
          (pack === 'all' || q.packs.includes(pack)) &&
          (difficulty === 'all' || q.difficulty === difficulty) &&
          (search.trim() === '' || q.title.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [pack, difficulty, search],
  );

  return (
    <main className="page problem-list-page">
      <div className="list-head">
        <h1 className="page-title">Problems</h1>
        <span className="muted">
          {filtered.length} of {questions.length}
        </span>
      </div>

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
                  <span className={`status ${done ? 'done' : ''}`} aria-label={done ? 'solved' : ''}>
                    {done ? '✓' : ''}
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
