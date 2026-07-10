import { describe, it, expect } from 'vitest';
import { selectSessionQuestions, type SessionConfig } from './session';
import type { Difficulty, Question } from '../content/types';

/** Minimal question fixture — only the fields the session logic reads. */
function q(id: string, difficulty: Difficulty = 'easy'): Question {
  return {
    id,
    slug: id,
    title: id,
    prompt: '',
    difficulty,
    packs: [],
    dialects: ['generic'],
    datasetId: 'ecommerce',
    canonical: { generic: 'SELECT 1' },
    grading: {},
  };
}

// A deterministic stand-in for the random shuffle: reverse the array. Lets us
// assert that `order: 'random'` uses the injected shuffle (vs sequential sort).
const reverse = <T>(arr: T[]): T[] => [...arr].reverse();

const base = (over: Partial<SessionConfig> = {}): SessionConfig => ({
  pool: 'all',
  includeSolved: false,
  size: 10,
  order: 'sequential',
  ...over,
});

describe('selectSessionQuestions', () => {
  it('pool "all" returns every candidate, capped to size', () => {
    const cands = [q('a'), q('b'), q('c')];
    const ids = selectSessionQuestions(cands, base({ size: 2 }), { solvedIds: [], reviewIds: [] });
    expect(ids).toEqual(['a', 'b']);
  });

  it('pool "unsolved" excludes solved questions', () => {
    const cands = [q('a'), q('b'), q('c')];
    const ids = selectSessionQuestions(cands, base({ pool: 'unsolved' }), {
      solvedIds: ['b'],
      reviewIds: [],
    });
    expect(ids).toEqual(['a', 'c']);
  });

  it('pool "unsolved" + includeSolved puts unsolved first, then solved as top-up', () => {
    const cands = [q('a'), q('b'), q('c'), q('d')];
    const ids = selectSessionQuestions(cands, base({ pool: 'unsolved', includeSolved: true }), {
      solvedIds: ['a', 'c'],
      reviewIds: [],
    });
    // unsolved (b, d) first, then solved (a, c) as top-up
    expect(ids).toEqual(['b', 'd', 'a', 'c']);
  });

  it('pool "unsolved" without includeSolved does not top up', () => {
    const cands = [q('a'), q('b')];
    const ids = selectSessionQuestions(cands, base({ pool: 'unsolved', size: 10 }), {
      solvedIds: ['a', 'b'],
      reviewIds: [],
    });
    expect(ids).toEqual([]);
  });

  it('pool "review" keeps only attempted-but-unsolved questions', () => {
    const cands = [q('a'), q('b'), q('c')];
    const ids = selectSessionQuestions(cands, base({ pool: 'review' }), {
      solvedIds: ['c'], // c solved → excluded even if also in review
      reviewIds: ['a', 'c'],
    });
    expect(ids).toEqual(['a']);
  });

  it('sequential order sorts easy → hard, stable within a level', () => {
    const cands = [q('h', 'hard'), q('e1', 'easy'), q('m', 'medium'), q('e2', 'easy')];
    const ids = selectSessionQuestions(cands, base(), { solvedIds: [], reviewIds: [] });
    expect(ids).toEqual(['e1', 'e2', 'm', 'h']);
  });

  it('random order uses the injected shuffle', () => {
    const cands = [q('a'), q('b'), q('c')];
    const ids = selectSessionQuestions(cands, base({ order: 'random' }), { solvedIds: [], reviewIds: [] }, reverse);
    expect(ids).toEqual(['c', 'b', 'a']);
  });

  it('random order shuffles unsolved and solved groups independently (unsolved still first)', () => {
    const cands = [q('a'), q('b'), q('c'), q('d')];
    const ids = selectSessionQuestions(
      cands,
      base({ pool: 'unsolved', includeSolved: true, order: 'random' }),
      { solvedIds: ['a', 'b'], reviewIds: [] },
      reverse,
    );
    // unsolved [c,d] reversed → [d,c]; solved [a,b] reversed → [b,a]; unsolved first
    expect(ids).toEqual(['d', 'c', 'b', 'a']);
  });

  it('caps a topped-up queue to size (unsolved take priority)', () => {
    const cands = [q('a'), q('b'), q('c'), q('d')];
    const ids = selectSessionQuestions(
      cands,
      base({ pool: 'unsolved', includeSolved: true, size: 3 }),
      { solvedIds: ['a', 'b'], reviewIds: [] },
    );
    // unsolved c,d first, then one solved to fill 3
    expect(ids).toEqual(['c', 'd', 'a']);
  });
});
