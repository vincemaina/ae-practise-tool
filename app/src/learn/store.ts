/** Flashcard review state in localStorage (no backend), keyed by card id. */
import type { CardReview, Rating } from './leitner';
import { reviewCard, dueCards } from './leitner';

const KEY = 'ae-practice:learn:v1';

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Data {
  cards: Record<string, CardReview>;
}

export interface LearnStore {
  states(): Record<string, CardReview>;
  getState(id: string): CardReview | undefined;
  /** Record a review of `id` with `rating`, rescheduling it (uses the clock). */
  review(id: string, rating: Rating): void;
  /** How many of `cards` are due today (unseen count as due). */
  dueCount<T extends { id: string }>(cards: T[]): number;
  /** How many cards were reviewed today (for the "all caught up" summary). */
  reviewedToday(): number;
}

/**
 * @param storage injectable for tests; defaults to localStorage when available.
 * @param now injectable clock for scheduling/streak tests.
 */
export function createLearnStore(
  storage?: Storage,
  now: () => Date = () => new Date(),
): LearnStore {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  const empty = (): Data => ({ cards: {} });

  const read = (): Data => {
    if (!store) return empty();
    try {
      const raw = store.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw) as Partial<Data>;
      return { cards: parsed.cards ?? {} };
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

  return {
    states: () => read().cards,
    getState: (id) => read().cards[id],
    review: (id, rating) => {
      const d = read();
      d.cards[id] = reviewCard(d.cards[id], rating, ymd(now()));
      write(d);
    },
    dueCount: (cards) => dueCards(cards, read().cards, ymd(now())).length,
    reviewedToday: () => {
      const today = ymd(now());
      return Object.values(read().cards).filter((c) => c.lastReviewed === today).length;
    },
  };
}
