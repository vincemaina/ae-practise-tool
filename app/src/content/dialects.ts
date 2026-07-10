import type { Dialect, Question } from './types';

/** Dialect selectable in the UI filter. `'all'` = no filtering (default). */
export type DialectFilter = 'all' | Dialect;

/** Dropdown options, in display order. 'all' first (default), then the concrete
 *  dialects. 'generic' presents as "Standard SQL" = only portable questions. */
export const DIALECT_OPTIONS: { id: DialectFilter; label: string }[] = [
  { id: 'all', label: 'All dialects' },
  { id: 'generic', label: 'Standard SQL' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'sqlserver', label: 'SQL Server' },
  { id: 'snowflake', label: 'Snowflake' },
  { id: 'bigquery', label: 'BigQuery' },
];

/** Whether a question should show under the selected dialect filter. A
 *  `generic` (portable) question matches every dialect; otherwise it must list
 *  the selected one. */
export function matchesDialect(q: Question, filter: DialectFilter): boolean {
  if (filter === 'all') return true;
  if (q.dialects.includes('generic')) return true;
  return q.dialects.includes(filter);
}
