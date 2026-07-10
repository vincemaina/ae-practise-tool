import type { Difficulty, Question } from '../content/types';

/**
 * A "practice session" is a disposable, user-configured queue of questions the
 * user works through back-to-back (see ROADMAP Phase 3). This module holds the
 * pure queue-building logic; UI/routing lives in the app. Kept dependency-free
 * and unit-tested with an injectable shuffle so ordering is deterministic in
 * tests (the app passes a Math.random-backed shuffle).
 */

/** Which questions a session may draw from. */
export type SessionPool = 'all' | 'unsolved' | 'review';
/** How the queue is ordered. */
export type SessionOrder = 'sequential' | 'random';

export interface SessionConfig {
  pool: SessionPool;
  /** When pool is 'unsolved', top the queue up with already-solved questions
   *  (after the unsolved ones) if there aren't enough unsolved to fill `size`. */
  includeSolved: boolean;
  /** Target number of questions; the queue is capped to this. */
  size: number;
  order: SessionOrder;
}

/** A live session: just the ordered queue of question ids. Index/progress is
 *  derived from which question is currently open, so this survives reloads. */
export interface SessionState {
  ids: string[];
  createdAt: string;
}

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** Identity ordering — the default "shuffle" so callers that want sequential
 *  order (or tests) get stable output unless they pass a real shuffle. */
const identity = <T>(arr: T[]): T[] => arr;

/** Order a group: sequential = easy→hard (stable within a level, preserving the
 *  input/registry order); random = the caller's shuffle. */
function orderGroup(group: Question[], order: SessionOrder, shuffle: <T>(a: T[]) => T[]): Question[] {
  if (order === 'random') return shuffle(group);
  return [...group].sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
}

/**
 * Build the ordered queue of question ids for a session.
 *
 * @param candidates questions already narrowed by dialect + pack/concept/difficulty.
 * @param config     pool / includeSolved / size / order.
 * @param ctx        the user's solved and needs-review id sets.
 * @param shuffle    used only for `order: 'random'`; defaults to identity.
 */
export function selectSessionQuestions(
  candidates: Question[],
  config: SessionConfig,
  ctx: { solvedIds: string[]; reviewIds: string[] },
  shuffle: <T>(arr: T[]) => T[] = identity,
): string[] {
  const solved = new Set(ctx.solvedIds);
  const review = new Set(ctx.reviewIds);

  let ordered: Question[];
  if (config.pool === 'review') {
    ordered = orderGroup(
      candidates.filter((q) => review.has(q.id) && !solved.has(q.id)),
      config.order,
      shuffle,
    );
  } else if (config.pool === 'unsolved') {
    const unsolved = orderGroup(
      candidates.filter((q) => !solved.has(q.id)),
      config.order,
      shuffle,
    );
    const topUp = config.includeSolved
      ? orderGroup(candidates.filter((q) => solved.has(q.id)), config.order, shuffle)
      : [];
    ordered = [...unsolved, ...topUp];
  } else {
    ordered = orderGroup(candidates, config.order, shuffle);
  }

  const size = Math.max(0, Math.floor(config.size));
  return ordered.slice(0, size).map((q) => q.id);
}

/** A Fisher–Yates shuffle. The app passes this (with Math.random); tests inject
 *  their own deterministic shuffle instead. */
export function randomShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
