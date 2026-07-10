/**
 * Scaffold a new question JSON file (ADR 0008). Usage:
 *   pnpm new:question <kebab-slug>
 * Then edit the file and run `pnpm verify:content` to check it end-to-end.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('Usage: pnpm new:question <kebab-slug>   (lowercase letters, digits, hyphens)');
  process.exit(1);
}

const path = fileURLToPath(new URL(`../src/content/questions/${slug}.json`, import.meta.url));
if (existsSync(path)) {
  console.error(`Already exists: src/content/questions/${slug}.json`);
  process.exit(1);
}

const template = {
  $schema: '../question.schema.json',
  id: `q-${slug}`,
  slug,
  title: 'TODO: short, human title',
  prompt:
    'TODO: describe the task. State the exact output columns and any required ordering ' +
    '(e.g. "Columns: name, total. Order by total desc, then name.").',
  difficulty: 'easy',
  packs: ['TODO pack name'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: ['SELECT 1 -- TODO: the reference solution (must produce the expected output)'],
  },
  grading: { orderMatters: false },
  hints: ['TODO: optional progressive hint'],
};

writeFileSync(path, JSON.stringify(template, null, 2) + '\n');
console.log(
  `Created src/content/questions/${slug}.json\n` +
    `Next: fill it in (pick a datasetId from src/content/datasets/), then run:\n` +
    `  pnpm verify:content   # runs your solution on the real engine and self-grades it`,
);
