import { describe, it, expect } from 'vitest';
import { createLearnStore } from './store';

/** In-memory Storage stand-in for tests. */
function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('createLearnStore', () => {
  it('counts all cards as due before any review', () => {
    const store = createLearnStore(memStorage(), () => new Date(2026, 6, 10));
    expect(store.dueCount(cards)).toBe(3);
    expect(store.reviewedToday()).toBe(0);
  });

  it('"Got it" schedules a card ahead so it is no longer due today', () => {
    const store = createLearnStore(memStorage(), () => new Date(2026, 6, 10));
    store.review('a', 'got-it');
    expect(store.dueCount(cards)).toBe(2); // a now due tomorrow
    expect(store.reviewedToday()).toBe(1);
    expect(store.getState('a')?.box).toBe(1);
  });

  it('"Again" keeps a card due today (box 1)', () => {
    const store = createLearnStore(memStorage(), () => new Date(2026, 6, 10));
    store.review('a', 'again');
    expect(store.dueCount(cards)).toBe(3); // a still due
    expect(store.getState('a')?.box).toBe(1);
  });

  it('persists across store instances sharing the same storage', () => {
    const storage = memStorage();
    createLearnStore(storage, () => new Date(2026, 6, 10)).review('a', 'got-it');
    const reopened = createLearnStore(storage, () => new Date(2026, 6, 10));
    expect(reopened.getState('a')?.box).toBe(1);
    expect(reopened.dueCount(cards)).toBe(2);
  });

  it('a card scheduled ahead becomes due again once its date arrives', () => {
    const storage = memStorage();
    createLearnStore(storage, () => new Date(2026, 6, 10)).review('a', 'got-it'); // due 07-11
    const nextDay = createLearnStore(storage, () => new Date(2026, 6, 11));
    expect(nextDay.dueCount(cards)).toBe(3);
  });
});
