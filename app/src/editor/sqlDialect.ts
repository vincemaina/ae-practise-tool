import { SQLDialect } from '@codemirror/lang-sql';

// DuckDB-flavoured dialect for highlighting + keyword completion (incl. QUALIFY).
// Shared by the editor (SqlEditor) and the read-only solution view (SqlBlock).
export const duckdbDialect = SQLDialect.define({
  keywords:
    'select from where group by having order asc desc limit offset join inner left right full outer cross natural on using as and or not in is null like ilike similar between case when then else end union all except intersect distinct with recursive over partition qualify window rows range unbounded preceding following current row exists filter within fetch first next only lateral',
  builtin:
    'count sum avg min max coalesce nullif round abs ceil floor greatest least row_number rank dense_rank ntile percent_rank cume_dist lag lead first_value last_value nth_value string_agg array_agg list date_trunc date_part datediff date_diff extract now current_date current_timestamp epoch length lower upper trim ltrim rtrim substring substr replace concat regexp_matches strftime try_cast cast',
  types:
    'int integer bigint smallint tinyint hugeint usmallint uinteger ubigint double real float decimal numeric varchar char text string boolean bool date time timestamp timestamptz interval blob uuid json struct list map',
});
