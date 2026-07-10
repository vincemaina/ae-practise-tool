import { useEffect, useMemo, useState } from 'react';
import {
  questions,
  recommendNext,
  matchesDialect,
  DIALECT_OPTIONS,
  type DialectFilter,
} from './content';
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
const DIALECT_KEY = 'ae-practice:dialect';

function readName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

function readDialect(): DialectFilter {
  try {
    const v = localStorage.getItem(DIALECT_KEY);
    if (v && DIALECT_OPTIONS.some((d) => d.id === v)) return v as DialectFilter;
  } catch {
    /* ignore */
  }
  return 'all';
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { path, navigate } = useRoute();
  const [solvedIds, setSolvedIds] = useState<string[]>(() => progress.getSolvedIds());
  const [reviewIds, setReviewIds] = useState<string[]>(() => progress.getReviewIds());
  const [streak, setStreak] = useState<number>(() => progress.stats().streak);
  const [userName, setUserName] = useState<string | null>(readName);
  const user = userName ? { name: userName } : null;

  const [dialect, setDialectState] = useState<DialectFilter>(readDialect);
  const dialectQuestions = useMemo(() => questions.filter((q) => matchesDialect(q, dialect)), [dialect]);
  function setDialect(d: DialectFilter) {
    try {
      localStorage.setItem(DIALECT_KEY, d);
    } catch {
      /* ignore */
    }
    setDialectState(d);
  }

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

  // Prev/next/shuffle move within the selected dialect's questions (falling back
  // to the full set if the current question is filtered out).
  const navPool = dialectQuestions.length ? dialectQuestions : questions;
  const poolIdx = question ? navPool.findIndex((q) => q.id === question.id) : -1;
  // -1 (not 0) when the open question is outside the dialect pool, so Next lands
  // on navPool[0] rather than skipping it.
  const base = poolIdx;
  const at = (i: number) => navPool[((i % navPool.length) + navPool.length) % navPool.length]!;

  const dialectSolved = solvedIds.filter((id) => dialectQuestions.some((q) => q.id === id));

  function goNextRecommended() {
    const recId = recommendNext(progress.getSolvedIds(), progress.getReviewIds(), dialectQuestions);
    const rec = recId ? questions.find((q) => q.id === recId) : null;
    if (rec) open(rec.slug);
    else home();
  }

  return (
    <div className="app">
      <TopBar
        solved={dialectSolved.length}
        total={dialectQuestions.length}
        streak={streak}
        theme={theme}
        onToggleTheme={toggle}
        onHome={home}
        nav={
          question
            ? {
                onBack: home,
                onPrev: () => open(at(base - 1).slug),
                onNext: () => open(at(base + 1).slug),
                onShuffle: () => open(at(Math.floor(Math.random() * navPool.length)).slug),
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
          dialect={dialect}
        />
      ) : (
        <ProblemList
          solvedIds={solvedIds}
          reviewIds={reviewIds}
          onOpen={open}
          dialect={dialect}
          onDialect={setDialect}
        />
      )}
      {import.meta.env.DEV && (
        <FeedbackWidget questionId={question?.id ?? null} questionSlug={question?.slug ?? null} />
      )}
    </div>
  );
}
