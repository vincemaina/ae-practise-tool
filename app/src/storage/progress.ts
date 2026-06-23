/** Minimal solved-question tracking in localStorage (no backend — ADR scope). */
const KEY = 'ae-practice:solved:v1';

export interface ProgressStore {
  getSolved(): string[];
  isSolved(id: string): boolean;
  markSolved(id: string): void;
}

/**
 * @param storage injectable for tests; defaults to localStorage when available
 *   (returns a no-op store in non-browser contexts like SSR or Node).
 */
export function createProgressStore(storage?: Storage): ProgressStore {
  const store =
    storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);

  const read = (): Set<string> => {
    if (!store) return new Set();
    try {
      const raw = store.getItem(KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  };

  const write = (set: Set<string>): void => {
    try {
      store?.setItem(KEY, JSON.stringify([...set]));
    } catch {
      // best-effort; ignore quota/serialization errors
    }
  };

  return {
    getSolved: () => [...read()],
    isSolved: (id) => read().has(id),
    markSolved: (id) => {
      const set = read();
      set.add(id);
      write(set);
    },
  };
}
