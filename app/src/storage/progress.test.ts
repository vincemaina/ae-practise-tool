import { describe, it, expect } from 'vitest';
import { createProgressStore } from './progress';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
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

describe('progress store', () => {
  it('starts empty', () => {
    const store = createProgressStore(fakeStorage());
    expect(store.getSolved()).toEqual([]);
  });

  it('marks and reports solved questions', () => {
    const store = createProgressStore(fakeStorage());
    store.markSolved('q1');
    store.markSolved('q2');
    expect(store.isSolved('q1')).toBe(true);
    expect(store.isSolved('q3')).toBe(false);
    expect(store.getSolved().sort()).toEqual(['q1', 'q2']);
  });

  it('is idempotent and persists across store instances on the same storage', () => {
    const storage = fakeStorage();
    createProgressStore(storage).markSolved('q1');
    createProgressStore(storage).markSolved('q1');
    expect(createProgressStore(storage).getSolved()).toEqual(['q1']);
  });

  it('degrades to a no-op when no storage is available', () => {
    const store = createProgressStore(undefined);
    expect(() => store.markSolved('q1')).not.toThrow();
  });
});
