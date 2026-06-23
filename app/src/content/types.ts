import type { GradeOptions } from '../grading/grade';

/** MVP ships "generic" only; the type is open for Snowflake/BigQuery later (ADR 0002). */
export type Dialect = 'generic' | 'snowflake' | 'bigquery';

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
}
