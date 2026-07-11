/** Node-side loader for dbt challenges (used by scripts/verify-dbt.ts). The app
 *  will load the same JSON via Vite glob when the UI lands (phase 4). */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChallenge } from './schema';
import type { DbtChallenge } from './challenge';

export const challenges: DbtChallenge[] = (() => {
  const dir = fileURLToPath(new URL('./challenges/', import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => parseChallenge(JSON.parse(readFileSync(`${dir}${f}`, 'utf8')), f));
})();
