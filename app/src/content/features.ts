/**
 * SQL feature catalog — the checklist we track coverage against. Each feature
 * has a `detect` that runs over a question's canonical SQL (DuckDB spelling), so
 * coverage counts are DERIVED, not hand-maintained (see `pnpm coverage`).
 *
 * `snowflake` notes where the Snowflake spelling differs from DuckDB's — i.e.
 * where a future dialect/transpile layer (ADR 0002) is needed for true fidelity.
 */
export interface Feature {
  id: string;
  label: string;
  category: string;
  detect: (sqlUpper: string) => boolean;
  /** Snowflake nuance / name difference, if any (null = identical syntax). */
  snowflake: string | null;
}

const has = (re: RegExp) => (s: string) => re.test(s);
const countMatches = (s: string, re: RegExp) => (s.match(re) || []).length;

// A plain/INNER JOIN = at least one JOIN not qualified by LEFT/RIGHT/FULL/CROSS/NATURAL.
const QUALIFIED_JOIN = /\b(LEFT|RIGHT|FULL|CROSS|NATURAL)\s+(OUTER\s+)?JOIN\b/g;
const ANY_JOIN = /\bJOIN\b/g;
const hasInnerJoin = (s: string) => countMatches(s, ANY_JOIN) > countMatches(s, QUALIFIED_JOIN);

export const CATEGORIES = [
  'Foundations',
  'Joins',
  'Aggregation & grouping',
  'Subqueries & CTEs',
  'Window functions',
  'Strings & regex',
  'Dates & time',
  'Semi-structured',
  'Set operations',
] as const;

export const FEATURES: Feature[] = [
  // Foundations
  { id: 'filter-where', label: 'Filtering (WHERE)', category: 'Foundations', detect: has(/\bWHERE\b/), snowflake: null },
  { id: 'order-by', label: 'Sorting (ORDER BY)', category: 'Foundations', detect: has(/\bORDER BY\b/), snowflake: null },
  { id: 'limit', label: 'LIMIT / OFFSET', category: 'Foundations', detect: has(/\bLIMIT\b/), snowflake: 'Snowflake also supports TOP n' },
  { id: 'distinct', label: 'DISTINCT', category: 'Foundations', detect: has(/\bDISTINCT\b/), snowflake: null },
  { id: 'case', label: 'CASE expressions', category: 'Foundations', detect: has(/\bCASE\b/), snowflake: null },
  { id: 'coalesce', label: 'COALESCE / NULLIF', category: 'Foundations', detect: has(/\b(COALESCE|NULLIF|IFNULL)\b/), snowflake: null },

  // Joins
  { id: 'join-inner', label: 'Inner join', category: 'Joins', detect: hasInnerJoin, snowflake: null },
  { id: 'join-left', label: 'Left join', category: 'Joins', detect: has(/\bLEFT\s+(OUTER\s+)?JOIN\b/), snowflake: null },
  { id: 'join-right', label: 'Right join', category: 'Joins', detect: has(/\bRIGHT\s+(OUTER\s+)?JOIN\b/), snowflake: null },
  { id: 'join-full', label: 'Full outer join', category: 'Joins', detect: has(/\bFULL\s+(OUTER\s+)?JOIN\b/), snowflake: null },
  { id: 'join-cross', label: 'Cross join', category: 'Joins', detect: has(/\bCROSS\s+JOIN\b/), snowflake: null },
  { id: 'join-self', label: 'Self join', category: 'Joins', detect: () => false, snowflake: 'Same in both — detected via aliasing; tag manually' },
  { id: 'anti-join', label: 'Anti-join (NOT IN / NOT EXISTS)', category: 'Joins', detect: has(/\bNOT\s+(IN|EXISTS)\b/), snowflake: null },
  { id: 'semi-join', label: 'Semi-join (IN / EXISTS)', category: 'Joins', detect: has(/(?<!NOT\s)\b(EXISTS)\b/), snowflake: null },

  // Aggregation & grouping
  { id: 'group-by', label: 'GROUP BY', category: 'Aggregation & grouping', detect: has(/\bGROUP BY\b/), snowflake: null },
  { id: 'having', label: 'HAVING', category: 'Aggregation & grouping', detect: has(/\bHAVING\b/), snowflake: null },
  { id: 'agg-basic', label: 'Aggregate functions', category: 'Aggregation & grouping', detect: has(/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/), snowflake: null },
  { id: 'agg-conditional', label: 'Conditional aggregation (FILTER / CASE)', category: 'Aggregation & grouping', detect: has(/\bFILTER\s*\(WHERE|SUM\(CASE|COUNT\(CASE/), snowflake: 'FILTER(WHERE …) works in both; Snowflake also uses SUM(CASE …)' },
  { id: 'rollup', label: 'GROUP BY ROLLUP', category: 'Aggregation & grouping', detect: has(/\bROLLUP\b/), snowflake: null },
  { id: 'cube', label: 'GROUP BY CUBE', category: 'Aggregation & grouping', detect: has(/\bCUBE\b/), snowflake: null },
  { id: 'grouping-sets', label: 'GROUPING SETS', category: 'Aggregation & grouping', detect: has(/\bGROUPING SETS\b/), snowflake: null },
  { id: 'grouping-fn', label: 'GROUPING() function', category: 'Aggregation & grouping', detect: has(/\bGROUPING\s*\(/), snowflake: null },
  { id: 'pivot', label: 'PIVOT / UNPIVOT', category: 'Aggregation & grouping', detect: has(/\b(PIVOT|UNPIVOT)\b/), snowflake: null },

  // Subqueries & CTEs
  { id: 'subquery', label: 'Subquery', category: 'Subqueries & CTEs', detect: has(/\(\s*SELECT\b/), snowflake: null },
  { id: 'cte', label: 'CTE (WITH)', category: 'Subqueries & CTEs', detect: has(/\bWITH\b[\s\S]*\bAS\s*\(/), snowflake: null },
  { id: 'cte-recursive', label: 'Recursive CTE', category: 'Subqueries & CTEs', detect: has(/\bWITH\s+RECURSIVE\b/), snowflake: 'Snowflake: WITH RECURSIVE or CONNECT BY' },

  // Window functions
  { id: 'win-rownum', label: 'ROW_NUMBER', category: 'Window functions', detect: has(/\bROW_NUMBER\s*\(/), snowflake: null },
  { id: 'win-rank', label: 'RANK / DENSE_RANK', category: 'Window functions', detect: has(/\b(DENSE_RANK|RANK)\s*\(/), snowflake: null },
  { id: 'win-laglead', label: 'LAG / LEAD', category: 'Window functions', detect: has(/\b(LAG|LEAD)\s*\(/), snowflake: null },
  { id: 'win-running', label: 'Running aggregate (OVER)', category: 'Window functions', detect: has(/\)\s*OVER\s*\(/), snowflake: null },
  { id: 'win-ntile', label: 'NTILE', category: 'Window functions', detect: has(/\bNTILE\s*\(/), snowflake: null },
  { id: 'win-firstlast', label: 'FIRST_VALUE / LAST_VALUE / NTH_VALUE', category: 'Window functions', detect: has(/\b(FIRST_VALUE|LAST_VALUE|NTH_VALUE)\s*\(/), snowflake: null },
  { id: 'win-frame', label: 'Explicit window frame (ROWS/RANGE BETWEEN)', category: 'Window functions', detect: has(/\b(ROWS|RANGE)\s+BETWEEN\b/), snowflake: null },
  { id: 'qualify', label: 'QUALIFY', category: 'Window functions', detect: has(/\bQUALIFY\b/), snowflake: null },

  // Strings & regex
  { id: 'like', label: 'LIKE / ILIKE', category: 'Strings & regex', detect: has(/\b(I?LIKE)\b/), snowflake: null },
  { id: 'substring', label: 'SUBSTRING / SPLIT / string funcs', category: 'Strings & regex', detect: has(/\b(SUBSTR|SUBSTRING|SPLIT_PART|LEFT|RIGHT|TRIM|CONCAT)\s*\(/), snowflake: null },
  { id: 'regex-match', label: 'Regex match', category: 'Strings & regex', detect: has(/\b(REGEXP_MATCHES|REGEXP_FULL_MATCH)\s*\(|~/), snowflake: 'Snowflake: REGEXP_LIKE / RLIKE' },
  { id: 'regex-extract', label: 'Regex extract', category: 'Strings & regex', detect: has(/\bREGEXP_EXTRACT\s*\(/), snowflake: 'Snowflake: REGEXP_SUBSTR' },
  { id: 'regex-extract-all', label: 'Regex extract all', category: 'Strings & regex', detect: has(/\bREGEXP_EXTRACT_ALL\s*\(/), snowflake: 'Snowflake: REGEXP_SUBSTR_ALL / REGEXP_SUBSTR(…, e)' },
  { id: 'regex-replace', label: 'Regex replace', category: 'Strings & regex', detect: has(/\bREGEXP_REPLACE\s*\(/), snowflake: 'Same name (REGEXP_REPLACE)' },

  // Dates & time
  { id: 'date-trunc', label: 'DATE_TRUNC', category: 'Dates & time', detect: has(/\bDATE_TRUNC\s*\(/), snowflake: null },
  { id: 'date-diff', label: 'Date difference', category: 'Dates & time', detect: has(/\b(DATE_DIFF|DATEDIFF)\s*\(/), snowflake: 'DuckDB date_diff(part,a,b) vs Snowflake DATEDIFF(part,a,b)' },
  { id: 'date-extract', label: 'EXTRACT / DATE_PART', category: 'Dates & time', detect: has(/\b(EXTRACT|DATE_PART)\s*\(/), snowflake: null },
  { id: 'date-interval', label: 'Interval arithmetic', category: 'Dates & time', detect: has(/\bINTERVAL\b/), snowflake: 'Snowflake: DATEADD / + INTERVAL' },

  // Semi-structured
  { id: 'json-extract', label: 'JSON field extraction', category: 'Semi-structured', detect: has(/->>|->|JSON_EXTRACT/), snowflake: 'Snowflake: col:field / GET_PATH / col:field::type' },
  { id: 'array', label: 'Array / list functions', category: 'Semi-structured', detect: has(/\b(LIST_|ARRAY_|UNNEST)\w*\s*\(|\bUNNEST\b/), snowflake: 'Snowflake: ARRAY_* / FLATTEN' },
  { id: 'lambda', label: 'Higher-order / lambda', category: 'Semi-structured', detect: has(/\b(LIST_TRANSFORM|LIST_FILTER|LIST_REDUCE|APPLY)\s*\(|->\s|LAMBDA/), snowflake: 'Snowflake: TRANSFORM / FILTER / REDUCE' },
  { id: 'flatten', label: 'FLATTEN / UNNEST rows', category: 'Semi-structured', detect: has(/\bUNNEST\s*\(/), snowflake: 'Snowflake: LATERAL FLATTEN' },

  // Set operations
  { id: 'union', label: 'UNION / UNION ALL', category: 'Set operations', detect: has(/\bUNION\b/), snowflake: null },
  { id: 'except', label: 'EXCEPT / MINUS', category: 'Set operations', detect: has(/\bEXCEPT\b/), snowflake: 'Snowflake: EXCEPT or MINUS' },
  { id: 'intersect', label: 'INTERSECT', category: 'Set operations', detect: has(/\bINTERSECT\b/), snowflake: null },
];
