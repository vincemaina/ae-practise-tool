import { describe, it, expect } from 'vitest';
import { reviewCard, isDue, dueCards, addDays, MAX_BOX, type CardReview } from './leitner';

describe('addDays', () => {
  it('adds calendar days across month boundaries', () => {
    expect(addDays('2026-01-30', 2)).toBe('2026-02-01');
    expect(addDays('2026-07-10', 0)).toBe('2026-07-10');
  });
});

describe('reviewCard', () => {
  it('first "Got it" on a new card lands in box 1, due +1 day', () => {
    expect(reviewCard(undefined, 'got-it', '2026-07-10')).toEqual({
      box: 1,
      due: '2026-07-11',
      lastReviewed: '2026-07-10',
    });
  });

  it('"Got it" promotes a box and lengthens the interval (box 2 → +2, box 3 → +4)', () => {
    const b1: CardReview = { box: 1, due: '2026-07-10', lastReviewed: '2026-07-09' };
    const b2 = reviewCard(b1, 'got-it', '2026-07-10');
    expect(b2).toEqual({ box: 2, due: '2026-07-12', lastReviewed: '2026-07-10' });
    const b3 = reviewCard(b2, 'got-it', '2026-07-12');
    expect(b3).toEqual({ box: 3, due: '2026-07-16', lastReviewed: '2026-07-12' });
  });

  it('caps at MAX_BOX', () => {
    let s: CardReview = { box: MAX_BOX, due: '2026-07-10', lastReviewed: '2026-07-01' };
    s = reviewCard(s, 'got-it', '2026-07-10');
    expect(s.box).toBe(MAX_BOX);
    expect(s.due).toBe('2026-07-26'); // +16
  });

  it('"Again" resets to box 1, due same day (relearn this session)', () => {
    const s: CardReview = { box: 4, due: '2026-07-10', lastReviewed: '2026-07-02' };
    expect(reviewCard(s, 'again', '2026-07-10')).toEqual({
      box: 1,
      due: '2026-07-10',
      lastReviewed: '2026-07-10',
    });
  });
});

describe('isDue / dueCards', () => {
  it('unseen cards are due; future-dated cards are not', () => {
    expect(isDue(undefined, '2026-07-10')).toBe(true);
    expect(isDue({ box: 2, due: '2026-07-12', lastReviewed: '2026-07-10' }, '2026-07-10')).toBe(false);
    expect(isDue({ box: 2, due: '2026-07-10', lastReviewed: '2026-07-08' }, '2026-07-10')).toBe(true);
  });

  it('dueCards returns unseen + arrived, filtering out scheduled-ahead cards', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const states = {
      a: { box: 3, due: '2026-07-20', lastReviewed: '2026-07-10' }, // ahead → not due
      b: { box: 1, due: '2026-07-10', lastReviewed: '2026-07-09' }, // due today
      // c unseen → due
    };
    expect(dueCards(cards, states, '2026-07-10').map((c) => c.id)).toEqual(['b', 'c']);
  });
});
