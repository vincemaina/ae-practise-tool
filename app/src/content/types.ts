import type { GradeOptions } from '../grading/grade';
import type { RequiredConstruct } from '../grading/requireConstruct';
import type { MessinessSpec } from './messiness';

/**
 * A question's `dialects` lists which SQL dialects it's *appropriate for*.
 * `'generic'` = portable/standard SQL → treated as applicable to every dialect.
 * Anything else restricts the question to those dialects (e.g. QUALIFY →
 * snowflake/bigquery). Execution/grading still uses the single `canonical.generic`
 * reference solution — this tag drives the product's dialect filter, not the engine.
 */
export type Dialect = 'generic' | 'postgres' | 'mysql' | 'sqlserver' | 'snowflake' | 'bigquery';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Dataset {
  id: string;
  title: string;
  /** Idempotent setup SQL (CREATE OR REPLACE …) that creates + seeds the tables. */
  setupSql: string;
  /** For the schema preview panel. */
  tables: { name: string; columns: string[] }[];
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  /** Natural-language task shown to the user. */
  prompt: string;
  difficulty: Difficulty;
  packs: string[];
  /** Dialects this question supports (only 'generic' populated in the MVP). */
  dialects: Dialect[];
  datasetId: string;
  /** Canonical solution per dialect. Expected output is computed at runtime by
   *  running this against the dataset (ADR 0003). */
  canonical: Partial<Record<Dialect, string>>;
  grading: GradeOptions;
  /** Progressive hints, shown on request (optional). */
  hints?: string[];
  /** 'write' (default) or 'debug' (fix a broken starter query). */
  challengeType?: 'write' | 'debug';
  /** For debug questions: the broken query the editor pre-fills with. */
  starterSql?: string;
  /** Feature ids (see features.ts) the auto-detector can't infer, e.g. self-joins. */
  features?: string[];
  /** For function/dialect showcase questions: also require the submitted SQL to
   *  use a specific construct (checked on top of output-equivalence, so e.g. LIKE
   *  can't stand in for a question about STARTSWITH). See requireConstruct.ts. */
  requires?: RequiredConstruct;
  /** Opt this question's dataset into deterministic "mess" (nulls, inconsistent
   *  case, whitespace, duplicate rows) the solver must handle. See messiness.ts. */
  messiness?: MessinessSpec;
}
