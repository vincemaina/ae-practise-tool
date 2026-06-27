/**
 * Structural metadata for a question, DERIVED from its canonical solution's
 * parse tree (DuckDB `json_serialize_sql`) — so it's always accurate and needs
 * no hand-authoring. Generated into `question-metadata.generated.ts` by
 * `pnpm meta:generate`; `verify:content` fails if that file drifts.
 *
 * `extractMetrics` itself is pure (walks the parsed AST) and unit-tested.
 */
export interface QuestionMetrics {
  /** Real base tables referenced (CTE names excluded). */
  tables: string[];
  tableCount: number;
  joins: number;
  windowFunctions: number;
  /** WITH stages in the final solution. */
  ctes: number;
  aggregates: number;
  subqueries: number;
  groupBy: boolean;
  orderBy: boolean;
  distinct: boolean;
}

const AGGREGATE_FUNCTIONS = new Set([
  'count', 'count_star', 'sum', 'avg', 'min', 'max', 'median', 'mode',
  'string_agg', 'list', 'array_agg', 'stddev', 'stddev_samp', 'stddev_pop',
  'var_samp', 'var_pop', 'variance', 'bool_and', 'bool_or', 'first', 'last',
  'arg_max', 'arg_min', 'quantile', 'approx_count_distinct',
]);

type Node = Record<string, unknown>;

export function extractMetrics(astJson: string): QuestionMetrics {
  const root: unknown = JSON.parse(astJson);
  const tables = new Set<string>();
  const cteNames = new Set<string>();
  let joins = 0;
  let windowFunctions = 0;
  let ctes = 0;
  let aggregates = 0;
  let subqueries = 0;
  let groupBy = false;
  let orderBy = false;
  let distinct = false;

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const n = value as Node;

    if (n.type === 'JOIN') joins++;
    if (n.type === 'BASE_TABLE' && typeof n.table_name === 'string') tables.add(n.table_name);
    if (n.class === 'WINDOW') windowFunctions++;
    // Expression subqueries carry `class`; FROM-clause derived tables are
    // table refs with `type:'SUBQUERY'` and no `class`. Count both, once each.
    if (n.class === 'SUBQUERY' || (n.type === 'SUBQUERY' && n.class === undefined)) subqueries++;
    if (
      n.class === 'FUNCTION' &&
      typeof n.function_name === 'string' &&
      AGGREGATE_FUNCTIONS.has(n.function_name)
    ) {
      aggregates++;
    }
    if (Array.isArray(n.group_expressions) && n.group_expressions.length > 0) groupBy = true;

    const cteMap = n.cte_map as { map?: unknown } | undefined;
    if (cteMap && Array.isArray(cteMap.map)) {
      ctes += cteMap.map.length;
      for (const entry of cteMap.map) {
        if (entry && typeof entry === 'object' && typeof (entry as Node).key === 'string') {
          cteNames.add((entry as Node).key as string);
        }
      }
    }

    if (Array.isArray(n.modifiers)) {
      for (const m of n.modifiers) {
        const mt = (m as Node | null)?.type;
        if (mt === 'ORDER_MODIFIER') orderBy = true;
        if (mt === 'DISTINCT_MODIFIER') distinct = true;
      }
    }

    for (const child of Object.values(n)) visit(child);
  };
  visit(root);

  const realTables = [...tables].filter((t) => !cteNames.has(t)).sort();
  return {
    tables: realTables,
    tableCount: realTables.length,
    joins,
    windowFunctions,
    ctes,
    aggregates,
    subqueries,
    groupBy,
    orderBy,
    distinct,
  };
}

/** Short human-readable chips, e.g. ["2 tables", "1 join", "window function"]. */
export function metricTags(m: QuestionMetrics): string[] {
  const tags: string[] = [];
  tags.push(`${m.tableCount} table${m.tableCount === 1 ? '' : 's'}`);
  if (m.joins) tags.push(`${m.joins} join${m.joins === 1 ? '' : 's'}`);
  if (m.windowFunctions) {
    tags.push(m.windowFunctions === 1 ? 'window function' : `${m.windowFunctions} window functions`);
  }
  if (m.ctes) tags.push(m.ctes === 1 ? 'CTE' : `${m.ctes} CTEs`);
  if (m.subqueries) tags.push('subquery');
  if (m.groupBy) tags.push('grouping');
  if (m.aggregates) tags.push('aggregation');
  return tags;
}
