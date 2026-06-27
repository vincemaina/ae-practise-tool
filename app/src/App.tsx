import { useState } from 'react';
import { questions } from './content';
import { ProblemList } from './components/ProblemList';
import { SolveView } from './components/SolveView';
import { TopBar } from './components/TopBar';
import { createProgressStore } from './storage/progress';
import { useTheme } from './theme/useTheme';
import { useRoute } from './route/useRoute';

const progress = createProgressStore();
const NAME_KEY = 'ae-practice:name';

function readName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { path, navigate } = useRoute();
  const [solved, setSolved] = useState<string[]>(() => progress.getSolved());
  const [userName, setUserName] = useState<string | null>(readName);
  const user = userName ? { name: userName } : null;

  function signIn(name: string) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* ignore */
    }
    setUserName(name);
  }
  function signOut() {
    try {
      localStorage.removeItem(NAME_KEY);
    } catch {
      /* ignore */
    }
    setUserName(null);
  }

  const slug = path.startsWith('/q/') ? decodeURIComponent(path.slice(3)) : null;
  const question = slug ? (questions.find((q) => q.slug === slug) ?? null) : null;

  const open = (s: string) => navigate(`/q/${s}`);
  const home = () => navigate('/');

  function handleSolved(id: string) {
    progress.markSolved(id);
    setSolved(progress.getSolved());
  }

  const idx = question ? questions.findIndex((q) => q.id === question.id) : -1;
  const at = (i: number) => questions[((i % questions.length) + questions.length) % questions.length]!;

  return (
    <div className="app">
      <TopBar
        solved={solved.length}
        total={questions.length}
        theme={theme}
        onToggleTheme={toggle}
        onHome={home}
        nav={
          question
            ? {
                onBack: home,
                onPrev: () => open(at(idx - 1).slug),
                onNext: () => open(at(idx + 1).slug),
                onShuffle: () => open(at(Math.floor(Math.random() * questions.length)).slug),
              }
            : null
        }
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      {question ? (
        <SolveView question={question} onSolved={handleSolved} dark={theme === 'dark'} />
      ) : (
        <ProblemList solvedIds={solved} onOpen={open} />
      )}
    </div>
  );
}
