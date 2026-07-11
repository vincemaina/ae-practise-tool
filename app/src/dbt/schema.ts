import { z } from 'zod';
import type { DbtChallenge } from './challenge';

/** Zod validation for authored dbt-challenge JSON (mirrors content/schema.ts:
 *  SQL/file contents may be a string or an array of lines). */
const sqlText = z.union([z.string(), z.array(z.string())]);
const toSql = (v: string | string[]): string => (Array.isArray(v) ? v.join('\n') : v);
const fileMap = z.record(z.string(), sqlText);

const gradingSchema = z
  .object({
    orderMatters: z.boolean().optional(),
    requireColumnNames: z.boolean().optional(),
    numericTolerance: z.number().optional(),
    caseSensitiveText: z.boolean().optional(),
  })
  .strict();

const challengeSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    prompt: z.string(),
    sources: sqlText,
    starter: fileMap,
    solution: fileMap,
    target: z.string(),
    grading: gradingSchema.optional(),
    checks: z
      .array(
        z
          .object({
            model: z.string(),
            materialized: z.enum(['view', 'table', 'incremental', 'ephemeral']).optional(),
            mustUse: z.array(z.string()).optional(),
            message: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
    increment: sqlText.optional(),
    hints: z.array(z.string()).optional(),
  })
  .strict();

const mapSql = (m: Record<string, string | string[]>): Record<string, string> =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, toSql(v)]));

export function parseChallenge(raw: unknown, source: string): DbtChallenge {
  let p: z.infer<typeof challengeSchema>;
  try {
    p = challengeSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const lines = e.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
      throw new Error(`Invalid dbt challenge in ${source}:\n${lines.join('\n')}`);
    }
    throw e;
  }
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    prompt: p.prompt,
    sources: toSql(p.sources),
    starter: mapSql(p.starter),
    solution: mapSql(p.solution),
    target: p.target,
    grading: p.grading ?? {},
    ...(p.checks ? { checks: p.checks } : {}),
    ...(p.increment ? { increment: toSql(p.increment) } : {}),
    ...(p.hints ? { hints: p.hints } : {}),
  };
}
