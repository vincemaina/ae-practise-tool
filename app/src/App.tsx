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
import { SessionSetup } from './components/SessionSetup';
import { LearnView } from './components/LearnView';
import { DbtChallengeList } from './components/DbtChallengeList';
import { DbtWorkspace } from './components/DbtWorkspace';
import { TopBar } from './components/TopBar';
import { createProgressStore } from './storage/progress';
import { createLearnStore, dbtDeck } from './learn';
import { challenges, getChallenge } from './dbt';
import type { SessionState } from './session/session';
import { useTheme } from './theme/useTheme';
import { useRoute } from './route/useRoute';
import { installTelemetry, logEvent } from './dev/telemetry';
import { FeedbackWidget } from './dev/FeedbackWidget';

const progress = createProgressStore();
const learn = createLearnStore();
const NAME_KEY = 'ae-practice:name';
const DIALECT_KEY = 'ae-practice:dialect';
const SESSION_KEY = 'ae-practice:session';

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

function readSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<SessionState>;
    if (Array.isArray(s.ids) && s.ids.length > 0) {
      return { ids: s.ids, createdAt: s.createdAt ?? '' };
    }
  } catch {
    /* ignore */
  }
  return null;
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
  const [session, setSessionState] = useState<SessionState | null>(readSession);
  const dialectQuestions = useMemo(() => questions.filter((q) => matchesDialect(q, dialect)), [dialect]);

  function setSession(s: SessionState | null) {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSessionState(s);
  }
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
  // Leaving the solve flow (logo / back / session exit) ends any active session.
  const home = () => {
    if (session) setSession(null);
    navigate('/');
  };
  const goLearn = () => {
    if (session) setSession(null);
    navigate('/learn');
  };
  const goModel = () => {
    if (session) setSession(null);
    navigate('/model');
  };
  function onCardReview() {
    progress.touchStreak();
    setStreak(progress.stats().streak);
  }
  const openById = (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (q) open(q.slug);
  };

  // Session queue nav — derived from which queued question is open, so it
  // survives reloads without storing a separate index.
  const sessionIds = session?.ids ?? [];
  const sessionIdx = question ? sessionIds.indexOf(question.id) : -1;
  const inSession = sessionIdx >= 0;

  function startSession(ids: string[]) {
    setSession({ ids, createdAt: new Date().toISOString() });
    const first = questions.find((q) => q.id === ids[0]);
    if (first) open(first.slug);
  }
  function advanceSession() {
    const next = sessionIds[sessionIdx + 1];
    if (next) openById(next);
    else home(); // past the last question — session complete, back to the list
  }

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

  const isSessionSetup = path === '/session';
  const isLearn = path.startsWith('/learn');
  const isModel = path.startsWith('/model');
  const modelChallenge = isModel && path.startsWith('/model/') ? getChallenge(path.slice('/model/'.length)) : undefined;
  const isLastInSession = inSession && sessionIdx === sessionIds.length - 1;
  const tab = isLearn ? 'learn' : isModel ? 'model' : 'practice';

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
                onPrev: inSession
                  ? () => sessionIdx > 0 && openById(sessionIds[sessionIdx - 1]!)
                  : () => open(at(base - 1).slug),
                onNext: inSession
                  ? advanceSession
                  : () => open(at(base + 1).slug),
                onShuffle: () => open(at(Math.floor(Math.random() * navPool.length)).slug),
              }
            : null
        }
        session={inSession ? { index: sessionIdx + 1, total: sessionIds.length } : null}
        tab={tab}
        onTab={(t) => (t === 'learn' ? goLearn() : t === 'model' ? goModel() : home())}
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      {isModel ? (
        modelChallenge ? (
          <DbtWorkspace key={modelChallenge.id} challenge={modelChallenge} dark={theme === 'dark'} />
        ) : (
          <DbtChallengeList challenges={challenges} onOpen={(slug) => navigate(`/model/${slug}`)} />
        )
      ) : isLearn ? (
        <LearnView deck={dbtDeck} store={learn} onReview={onCardReview} />
      ) : isSessionSetup ? (
        <SessionSetup
          questions={dialectQuestions}
          solvedIds={solvedIds}
          reviewIds={reviewIds}
          onStart={startSession}
          onCancel={home}
        />
      ) : question ? (
        <SolveView
          question={question}
          onAttempt={handleAttempt}
          onNext={inSession ? advanceSession : goNextRecommended}
          nextLabel={inSession ? (isLastInSession ? 'Finish session ✓' : 'Next in session →') : undefined}
          dark={theme === 'dark'}
          dialect={dialect}
        />
      ) : (
        <ProblemList
          solvedIds={solvedIds}
          reviewIds={reviewIds}
          onOpen={open}
          onStartSession={() => navigate('/session')}
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
