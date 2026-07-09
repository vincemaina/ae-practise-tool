import { describe, it, expect } from 'vitest';
import { createProgressStore } from './progress';

function fakeStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const clock = (iso: string) => () => new Date(iso);

describe('progress store', () => {
  it('records solved and attempted-but-unsolved (review)', () => {
    const s = createProgressStore(fakeStorage(), clock('2026-06-28T10:00:00Z'));
    s.recordAttempt('q1', false);
    s.recordAttempt('q1', false);
    s.recordAttempt('q2', true);
    expect(s.isSolved('q2')).toBe(true);
    expect(s.isSolved('q1')).toBe(false);
    expect(s.getSolvedIds()).toEqual(['q2']);
    expect(s.getReviewIds()).toEqual(['q1']);
    expect(s.get('q1').attempts).toBe(2);
    expect(s.stats()).toMatchObject({ solved: 1, attempted: 2 });
  });

  it('moves a question out of review once solved', () => {
    const s = createProgressStore(fakeStorage(), clock('2026-06-28T10:00:00Z'));
    s.recordAttempt('q1', false);
    expect(s.getReviewIds()).toEqual(['q1']);
    s.recordAttempt('q1', true);
    expect(s.getReviewIds()).toEqual([]);
    expect(s.getSolvedIds()).toEqual(['q1']);
  });

  it('builds a daily streak and resets after a gap', () => {
    const storage = fakeStorage();
    createProgressStore(storage, clock('2026-06-26T09:00:00Z')).recordAttempt('q1', true);
    createProgressStore(storage, clock('2026-06-27T09:00:00Z')).recordAttempt('q2', true);
    expect(createProgressStore(storage, clock('2026-06-27T20:00:00Z')).stats().streak).toBe(2);
    // skip the 28th; practice on the 29th → streak resets to 1
    createProgressStore(storage, clock('2026-06-29T09:00:00Z')).recordAttempt('q3', false);
    expect(createProgressStore(storage, clock('2026-06-29T10:00:00Z')).stats().streak).toBe(1);
  });

  it('reports a broken streak as 0 when last active day is stale', () => {
    const storage = fakeStorage();
    createProgressStore(storage, clock('2026-06-20T09:00:00Z')).recordAttempt('q1', true);
    expect(createProgressStore(storage, clock('2026-06-28T09:00:00Z')).stats().streak).toBe(0);
  });

  it('migrates the legacy solved-id array', () => {
    const storage = fakeStorage({ 'ae-practice:solved:v1': JSON.stringify(['qa', 'qb']) });
    const s = createProgressStore(storage);
    expect(s.getSolvedIds().sort()).toEqual(['qa', 'qb']);
    expect(s.isSolved('qa')).toBe(true);
  });

  it('degrades to a no-op without storage', () => {
    const s = createProgressStore(undefined);
    expect(() => s.recordAttempt('q1', true)).not.toThrow();
  });
});
