/** Per-question progress + a daily streak, in localStorage (no backend). */
const KEY = 'ae-practice:progress:v2';
const LEGACY_KEY = 'ae-practice:solved:v1';

export interface QuestionProgress {
  solved: boolean;
  attempts: number;
  lastAttemptAt?: string;
  solvedAt?: string;
}

export interface ProgressStats {
  solved: number;
  attempted: number;
  /** Live streak (0 if the last active day wasn't today/yesterday). */
  streak: number;
  longestStreak: number;
}

export interface ProgressStore {
  isSolved(id: string): boolean;
  getSolvedIds(): string[];
  /** Attempted but not yet solved — the "needs review" set. */
  getReviewIds(): string[];
  get(id: string): QuestionProgress;
  recordAttempt(id: string, correct: boolean): void;
  stats(): ProgressStats;
}

interface Data {
  questions: Record<string, QuestionProgress>;
  streak: { current: number; longest: number; lastActiveDay?: string };
}

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Calendar day before `d` (DST-safe — decrements the date component, not by 24h ms). */
const prevYmd = (d: Date): string => ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));

/**
 * @param storage injectable for tests; defaults to localStorage when available.
 * @param now injectable clock for streak tests.
 */
export function createProgressStore(
  storage?: Storage,
  now: () => Date = () => new Date(),
): ProgressStore {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);

  const empty = (): Data => ({ questions: {}, streak: { current: 0, longest: 0 } });

  const read = (): Data => {
    if (!store) return empty();
    try {
      const raw = store.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Data>;
        return { questions: parsed.questions ?? {}, streak: parsed.streak ?? { current: 0, longest: 0 } };
      }
      // One-time migration from the old solved-id array — persist it under the
      // v2 key so we don't re-parse the legacy array on every read.
      const legacy = store.getItem(LEGACY_KEY);
      if (legacy) {
        const data = empty();
        for (const id of JSON.parse(legacy) as string[]) {
          data.questions[id] = { solved: true, attempts: 1 };
        }
        write(data);
        return data;
      }
      return empty();
    } catch {
      return empty();
    }
  };

  const write = (d: Data): void => {
    try {
      store?.setItem(KEY, JSON.stringify(d));
    } catch {
      /* best-effort */
    }
  };

  const streakAlive = (d: Data): boolean => {
    const today = ymd(now());
    return d.streak.lastActiveDay === today || d.streak.lastActiveDay === prevYmd(now());
  };

  return {
    isSolved: (id) => Boolean(read().questions[id]?.solved),
    getSolvedIds: () =>
      Object.entries(read().questions)
        .filter(([, q]) => q.solved)
        .map(([id]) => id),
    getReviewIds: () =>
      Object.entries(read().questions)
        .filter(([, q]) => !q.solved && q.attempts > 0)
        .map(([id]) => id),
    get: (id) => read().questions[id] ?? { solved: false, attempts: 0 },

    recordAttempt: (id, correct) => {
      const d = read();
      const q = d.questions[id] ?? { solved: false, attempts: 0 };
      q.attempts += 1;
      q.lastAttemptAt = now().toISOString();
      if (correct && !q.solved) {
        q.solved = true;
        q.solvedAt = q.lastAttemptAt;
      } else if (correct) {
        q.solved = true;
      }
      d.questions[id] = q;

      // Any attempt counts as an active day for the streak.
      const today = ymd(now());
      if (d.streak.lastActiveDay !== today) {
        d.streak.current = d.streak.lastActiveDay === prevYmd(now()) ? d.streak.current + 1 : 1;
        d.streak.lastActiveDay = today;
        d.streak.longest = Math.max(d.streak.longest, d.streak.current);
      }
      write(d);
    },

    stats: () => {
      const d = read();
      const qs = Object.values(d.questions);
      return {
        solved: qs.filter((q) => q.solved).length,
        attempted: qs.length,
        streak: streakAlive(d) ? d.streak.current : 0,
        longestStreak: d.streak.longest,
      };
    },
  };
}
