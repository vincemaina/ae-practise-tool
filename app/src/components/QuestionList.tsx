import type { Difficulty, Question } from '../content/types';
import { DifficultyBadge } from './DifficultyBadge';

interface Props {
  questions: Question[];
  selectedId: string;
  solvedIds: string[];
  onSelect: (id: string) => void;
  packs: string[];
  packFilter: string;
  onPackFilter: (pack: string) => void;
  difficulties: Difficulty[];
  difficultyFilter: Difficulty | 'all';
  onDifficultyFilter: (difficulty: Difficulty | 'all') => void;
}

export function QuestionList(props: Props) {
  const solved = new Set(props.solvedIds);
  return (
    <div>
      <div className="filters">
        <select
          value={props.packFilter}
          onChange={(e) => props.onPackFilter(e.target.value)}
          aria-label="Filter by pack"
          data-testid="filter-pack"
        >
          <option value="all">All packs</option>
          {props.packs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={props.difficultyFilter}
          onChange={(e) => props.onDifficultyFilter(e.target.value as Difficulty | 'all')}
          aria-label="Filter by difficulty"
          data-testid="filter-difficulty"
        >
          <option value="all">All levels</option>
          {props.difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <ul className="question-list" data-testid="question-list">
        {props.questions.map((q) => {
          const done = solved.has(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`question-item ${q.id === props.selectedId ? 'selected' : ''}`}
                onClick={() => props.onSelect(q.id)}
                data-testid={`q-${q.slug}`}
              >
                <span
                  className={`status ${done ? 'done' : ''}`}
                  aria-label={done ? 'solved' : 'not solved'}
                >
                  {done ? '✓' : ''}
                </span>
                <span className="q-main">
                  <span className="q-title">{q.title}</span>
                  <span className="q-sub muted">{q.packs[0]}</span>
                </span>
                <DifficultyBadge difficulty={q.difficulty} />
              </button>
            </li>
          );
        })}
        {props.questions.length === 0 && <li className="muted">No questions match.</li>}
      </ul>
    </div>
  );
}
