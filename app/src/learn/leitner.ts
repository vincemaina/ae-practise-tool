/**
 * Leitner-box spaced repetition (see decisions/0007-learn-mode-flashcards.md).
 * Pure and unit-tested; the store (store.ts) persists the state this produces.
 *
 * A card lives in a box 1..MAX_BOX. "Got it" promotes it one box (longer wait);
 * "Again" resets it to box 1, due the same day so it re-surfaces this session.
 * Dates are `YYYY-MM-DD` strings — lexical comparison matches chronological.
 */
export type Rating = 'again' | 'got-it';

export interface CardReview {
  /** Current Leitner box, 1..MAX_BOX (higher = reviewed less often). */
  box: number;
  /** Date the card is next due (YYYY-MM-DD). */
  due: string;
  /** Date it was last reviewed (YYYY-MM-DD). */
  lastReviewed: string;
}

export const MAX_BOX = 5;
/** Days until next review, indexed by box (box 1 → 1 day … box 5 → 16). */
export const BOX_INTERVALS = [0, 1, 2, 4, 8, 16];

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Add `days` calendar days to a YYYY-MM-DD string (DST-safe — uses date parts). */
export function addDays(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  return ymd(new Date(y!, m! - 1, d! + days));
}

/**
 * Apply a review. A brand-new card (no prior state) starts effectively at box 0,
 * so a first "Got it" lands it in box 1.
 */
export function reviewCard(
  prev: CardReview | undefined,
  rating: Rating,
  today: string,
): CardReview {
  if (rating === 'again') {
    return { box: 1, due: today, lastReviewed: today };
  }
  const box = Math.min(MAX_BOX, (prev?.box ?? 0) + 1);
  return { box, due: addDays(today, BOX_INTERVALS[box]!), lastReviewed: today };
}

/** A card is due when it's never been reviewed or its due date has arrived. */
export function isDue(state: CardReview | undefined, today: string): boolean {
  return !state || state.due <= today;
}

/** The cards due for review today (unseen cards count as due). */
export function dueCards<T extends { id: string }>(
  cards: T[],
  states: Record<string, CardReview>,
  today: string,
): T[] {
  return cards.filter((c) => isDue(states[c.id], today));
}
