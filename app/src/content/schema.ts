import { z } from 'zod';
import type { Dataset, Dialect, Question } from './types';

/**
 * Zod schemas for the JSON content authoring format (ADR 0008) + the transform
 * to the runtime `Question`/`Dataset` shapes. Both the app loader (Vite glob) and
 * the Node script loader validate through here, so a contributed file is checked
 * the same way everywhere. SQL may be written as one string or an array of lines
 * (joined with newlines) — the array form keeps multi-line SQL readable in JSON.
 */

const DIALECTS = [
  'generic',
  'postgres',
  'mysql',
  'sqlserver',
  'snowflake',
  'bigquery',
] as const satisfies readonly Dialect[];

const sqlText = z.union([z.string(), z.array(z.string())]);
const toSql = (v: string | string[]): string => (Array.isArray(v) ? v.join('\n') : v);

const gradingSchema = z
  .object({
    orderMatters: z.boolean().optional(),
    requireColumnNames: z.boolean().optional(),
    numericTolerance: z.number().optional(),
    caseSensitiveText: z.boolean().optional(),
  })
  .strict();

const questionSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    prompt: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    packs: z.array(z.string()),
    dialects: z.array(z.enum(DIALECTS)).min(1),
    datasetId: z.string(),
    /** Display order in the problem list (lower = earlier). Optional; new
     *  questions without one sort after the curated set. */
    order: z.number().optional(),
    canonical: z.partialRecord(z.enum(DIALECTS), sqlText),
    grading: gradingSchema.optional(),
    requires: z
      .object({ pattern: z.string(), flags: z.string().optional(), message: z.string() })
      .strict()
      .optional(),
    hints: z.array(z.string()).optional(),
    challengeType: z.enum(['write', 'debug']).optional(),
    starterSql: sqlText.optional(),
    features: z.array(z.string()).optional(),
  })
  .strict()
  .refine((q) => Boolean(q.canonical.generic), {
    message: 'canonical.generic is required (the portable reference solution)',
    path: ['canonical', 'generic'],
  });

const datasetSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string(),
    title: z.string(),
    tables: z.array(z.object({ name: z.string(), columns: z.array(z.string()) }).strict()),
    setupSql: sqlText,
  })
  .strict();

export type QuestionSchema = typeof questionSchema;
export type DatasetSchema = typeof datasetSchema;
export { questionSchema, datasetSchema };

/** Re-throw a ZodError as a readable, source-tagged message for contributors. */
function friendly(e: unknown, source: string): never {
  if (e instanceof z.ZodError) {
    const lines = e.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid question/dataset in ${source}:\n${lines.join('\n')}`);
  }
  throw e;
}

/** Parse + validate a raw JSON question, returning the runtime shape + sort order. */
export function parseQuestion(raw: unknown, source: string): { question: Question; order: number } {
  let p: z.infer<typeof questionSchema>;
  try {
    p = questionSchema.parse(raw);
  } catch (e) {
    friendly(e, source);
  }
  const canonical: Partial<Record<Dialect, string>> = {};
  for (const [d, v] of Object.entries(p.canonical)) {
    if (v !== undefined) canonical[d as Dialect] = toSql(v);
  }
  const question: Question = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    prompt: p.prompt,
    difficulty: p.difficulty,
    packs: p.packs,
    dialects: p.dialects,
    datasetId: p.datasetId,
    canonical,
    grading: p.grading ?? {},
    ...(p.hints ? { hints: p.hints } : {}),
    ...(p.challengeType ? { challengeType: p.challengeType } : {}),
    ...(p.starterSql ? { starterSql: toSql(p.starterSql) } : {}),
    ...(p.features ? { features: p.features } : {}),
    ...(p.requires
      ? {
          requires: {
            pattern: new RegExp(p.requires.pattern, p.requires.flags ?? 'i'),
            message: p.requires.message,
          },
        }
      : {}),
  };
  return { question, order: p.order ?? 10_000 };
}

/** Parse + validate a raw JSON dataset into the runtime shape. */
export function parseDataset(raw: unknown, source: string): Dataset {
  let p: z.infer<typeof datasetSchema>;
  try {
    p = datasetSchema.parse(raw);
  } catch (e) {
    friendly(e, source);
  }
  return { id: p.id, title: p.title, tables: p.tables, setupSql: toSql(p.setupSql) };
}
