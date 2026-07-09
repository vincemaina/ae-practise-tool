import { useEffect, useState } from 'react';
import { questions, recommendNext } from './content';
import { ProblemList } from './components/ProblemList';
import { SolveView } from './components/SolveView';
import { TopBar } from './components/TopBar';
import { createProgressStore } from './storage/progress';
import { useTheme } from './theme/useTheme';
import { useRoute } from './route/useRoute';
import { installTelemetry, logEvent } from './dev/telemetry';
import { FeedbackWidget } from './dev/FeedbackWidget';

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
  const [solvedIds, setSolvedIds] = useState<string[]>(() => progress.getSolvedIds());
  const [reviewIds, setReviewIds] = useState<string[]>(() => progress.getReviewIds());
  const [streak, setStreak] = useState<number>(() => progress.stats().streak);
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

  useEffect(() => {
    installTelemetry();
  }, []);
  useEffect(() => {
    logEvent('nav', { questionId: question?.id ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const open = (s: string) => navigate(`/q/${s}`);
  const home = () => navigate('/');

  function handleAttempt(id: string, correct: boolean) {
    progress.recordAttempt(id, correct);
    setSolvedIds(progress.getSolvedIds());
    setReviewIds(progress.getReviewIds());
    setStreak(progress.stats().streak);
  }

  const idx = question ? questions.findIndex((q) => q.id === question.id) : -1;
  const at = (i: number) => questions[((i % questions.length) + questions.length) % questions.length]!;

  function goNextRecommended() {
    const recId = recommendNext(progress.getSolvedIds(), progress.getReviewIds());
    const rec = recId ? questions.find((q) => q.id === recId) : null;
    if (rec) open(rec.slug);
    else home();
  }

  return (
    <div className="app">
      <TopBar
        solved={solvedIds.length}
        total={questions.length}
        streak={streak}
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
        <SolveView
          question={question}
          onAttempt={handleAttempt}
          onNext={goNextRecommended}
          dark={theme === 'dark'}
        />
      ) : (
        <ProblemList solvedIds={solvedIds} reviewIds={reviewIds} onOpen={open} />
      )}
      {import.meta.env.DEV && (
        <FeedbackWidget questionId={question?.id ?? null} questionSlug={question?.slug ?? null} />
      )}
    </div>
  );
}
