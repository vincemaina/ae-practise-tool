/** App-side loader for dbt challenges (Vite glob; the scripts use node.ts). */
import { parseChallenge } from './schema';
import type { DbtChallenge } from './challenge';

const modules = import.meta.glob('./challenges/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

export const challenges: DbtChallenge[] = Object.entries(modules)
  .map(([path, m]) => parseChallenge(m.default, path))
  .sort((a, b) => a.title.localeCompare(b.title));

export function getChallenge(slug: string): DbtChallenge | undefined {
  return challenges.find((c) => c.slug === slug);
}

export type { DbtChallenge };
export { gradeSubmission, type DbtGradeResult } from './grade';
