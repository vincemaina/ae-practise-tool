import type { Difficulty } from '../content/types';

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`badge badge-${difficulty}`}>{difficulty}</span>;
}
