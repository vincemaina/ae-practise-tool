import { useMemo, useState } from 'react';
import { questions, allPacks, difficulties } from './content';
import type { Difficulty } from './content/types';
import { QuestionList } from './components/QuestionList';
import { PracticeView } from './components/PracticeView';
import { createProgressStore } from './storage/progress';
import { useTheme } from './theme/useTheme';

const progress = createProgressStore();

export default function App() {
  const { theme, toggle } = useTheme();
  const [solved, setSolved] = useState<string[]>(() => progress.getSolved());
  const [packFilter, setPackFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string>(questions[0]!.id);

  const filtered = useMemo(
    () =>
      questions.filter(
        (q) =>
          (packFilter === 'all' || q.packs.includes(packFilter)) &&
          (difficultyFilter === 'all' || q.difficulty === difficultyFilter),
      ),
    [packFilter, difficultyFilter],
  );

  const selected = questions.find((q) => q.id === selectedId) ?? questions[0]!;
  const pct = questions.length ? Math.round((solved.length / questions.length) * 100) : 0;

  function handleSolved(id: string) {
    progress.markSolved(id);
    setSolved(progress.getSolved());
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⌁</span>
          AE Practice
        </div>
        <div className="topbar-right">
          <div className="progress">
            <span className="muted" data-testid="progress">
              Solved {solved.length}/{questions.length}
            </span>
            <div
              className="progressbar"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progressbar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <QuestionList
            questions={filtered}
            selectedId={selectedId}
            solvedIds={solved}
            onSelect={setSelectedId}
            packs={allPacks}
            packFilter={packFilter}
            onPackFilter={setPackFilter}
            difficulties={difficulties}
            difficultyFilter={difficultyFilter}
            onDifficultyFilter={setDifficultyFilter}
          />
        </aside>

        <main className="main">
          <PracticeView key={selected.id} question={selected} onSolved={handleSolved} dark={theme === 'dark'} />
        </main>
      </div>
    </div>
  );
}
