import { describe, it, expect } from 'vitest';
import { recommendNext, questions } from './index';

const allIds = questions.map((q) => q.id);

describe('recommendNext', () => {
  it('prioritises a question that needs review', () => {
    expect(recommendNext([], ['q-sessions-per-user'])).toBe('q-sessions-per-user');
  });

  it('recommends an easy unsolved question for a fresh user', () => {
    const rec = recommendNext([], []);
    expect(rec).toBeTruthy();
    const q = questions.find((x) => x.id === rec);
    expect(q?.difficulty).toBe('easy');
  });

  it('returns null when everything is solved', () => {
    expect(recommendNext(allIds, [])).toBeNull();
  });

  it('only ever recommends an unsolved (or review) question', () => {
    const solved = allIds.slice(0, 5);
    const rec = recommendNext(solved, []);
    expect(rec).toBeTruthy();
    expect(solved).not.toContain(rec);
  });
});
