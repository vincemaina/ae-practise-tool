import type { Dataset, Difficulty, Question } from './types';
import type { QuestionMetrics } from './metrics';
import { conceptsOf, CONCEPT_ORDER } from './metrics';
import { questionMetadata } from './question-metadata.generated';
import { parseQuestion, parseDataset } from './schema';
export { paths, type LearningPath } from './paths';
export { DIALECT_OPTIONS, matchesDialect, type DialectFilter } from './dialects';

// Content is authored as JSON (ADR 0008) and auto-discovered: drop a file in
// questions/ or datasets/ and it's registered — no edits here. Every file is
// validated through the shared Zod schema. The Node scripts load the same JSON
// via ./node.ts (they run outside Vite, so can't use import.meta.glob).
const questionModules = import.meta.glob('./questions/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;
export const questions: Question[] = Object.entries(questionModules)
  .map(([path, m]) => parseQuestion(m.default, path))
  .sort((a, b) => a.order - b.order)
  .map((l) => l.question);

const datasetModules = import.meta.glob('./datasets/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;
const datasets: Record<string, Dataset> = {};
for (const [path, m] of Object.entries(datasetModules)) {
  const d = parseDataset(m.default, path);
  datasets[d.id] = d;
}

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * The next question to recommend: finish "needs review" first (easiest first),
 * otherwise target the user's least-practiced concept at the easiest unsolved
 * level. Returns null when everything is solved.
 */
export function recommendNext(
  solvedIds: string[],
  reviewIds: string[],
  pool: Question[] = questions,
): string | null {
  const solved = new Set(solvedIds);
  const inPool = new Set(pool.map((q) => q.id));

  const review = reviewIds
    .filter((id) => !solved.has(id) && inPool.has(id))
    .map((id) => pool.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q))
    .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
  if (review[0]) return review[0].id;

  const unsolved = pool.filter((q) => !solved.has(q.id));
  if (unsolved.length === 0) return null;

  const conceptSolved: Record<string, number> = {};
  for (const id of solvedIds) {
    for (const c of questionConcepts(id)) conceptSolved[c] = (conceptSolved[c] ?? 0) + 1;
  }
  const weakness = (q: Question) => {
    const cs = questionConcepts(q.id);
    // No concepts (basic questions) → treat as "not weak" so they sort last,
    // rather than tying at 0 and perpetually leading the recommendation.
    return cs.length ? Math.min(...cs.map((c) => conceptSolved[c] ?? 0)) : Infinity;
  };
  const sorted = [...unsolved].sort(
    (a, b) => weakness(a) - weakness(b) || DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty],
  );
  return sorted[0]?.id ?? null;
}

export const firstQuestion: Question = questions[0]!;

export const allPacks: string[] = [...new Set(questions.flatMap((q) => q.packs))].sort();

export const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

export function getDataset(id: string): Dataset {
  const dataset = datasets[id];
  if (!dataset) throw new Error(`Unknown dataset: ${id}`);
  return dataset;
}

export function getQuestion(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

/** Structural metrics derived from the canonical solution (see metrics.ts). */
export function getMetrics(id: string): QuestionMetrics | undefined {
  return questionMetadata[id];
}

/** Structural concepts a question exercises (for concept filtering). */
export function questionConcepts(id: string): string[] {
  const m = questionMetadata[id];
  return m ? conceptsOf(m) : [];
}

/** All concepts present across the bank, in canonical order. */
export const allConcepts: string[] = CONCEPT_ORDER.filter((concept) =>
  questions.some((q) => questionConcepts(q.id).includes(concept)),
);
