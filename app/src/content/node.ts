/**
 * Node-side content loader for the tsx scripts (verify-content, generate-metadata,
 * coverage). The app loads the same JSON via Vite glob in `index.ts`; here we read
 * from the filesystem because those scripts run outside Vite (no import.meta.glob).
 * Both go through the shared `schema.ts` validator, so content is checked the same
 * way everywhere. Only what the scripts need is exported.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseQuestion, parseDataset } from './schema';
import type { Dataset, Question } from './types';

export { paths } from './paths';

function readJsonDir<T>(relDir: string, parse: (raw: unknown, source: string) => T): T[] {
  const dir = fileURLToPath(new URL(relDir, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => parse(JSON.parse(readFileSync(`${dir}${f}`, 'utf8')), f));
}

export const questions: Question[] = readJsonDir(
  './questions/',
  (raw, source) => parseQuestion(raw, source).question,
);

const datasetList = readJsonDir('./datasets/', parseDataset);
export const datasets: Record<string, Dataset> = Object.fromEntries(
  datasetList.map((d) => [d.id, d]),
);

export function getDataset(id: string): Dataset {
  const d = datasets[id];
  if (!d) throw new Error(`Unknown dataset: ${id}`);
  return d;
}
