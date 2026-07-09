# Snowflake features vs our DuckDB engine (2026-06-28)

Research to plan "advanced / Snowflake" content. Coverage tracker: `pnpm coverage` → [`COVERAGE.md`](../../COVERAGE.md).

## The core fact
We execute on **DuckDB-Wasm**. DuckDB supports the *concepts* behind almost everything the user named — but for some, the **Snowflake spelling differs**, so a Snowflake query wouldn't run as-is (that's the transpile/validate layer we deferred in ADR 0002).

### Identical syntax in Snowflake and DuckDB → build now, zero dialect risk
- `GROUP BY ROLLUP / CUBE / GROUPING SETS`, `GROUPING()`
- All join types: `INNER`, `LEFT`, `RIGHT`, `FULL OUTER`, `CROSS`, self/anti/semi
- `QUALIFY`, `PIVOT` / `UNPIVOT`
- Window functions: `NTILE`, `FIRST_VALUE`/`LAST_VALUE`, `ROWS/RANGE BETWEEN` frames
- Set ops: `UNION [ALL]`, `EXCEPT`, `INTERSECT`
- `CASE`, `COALESCE`, `DISTINCT`, `HAVING`, recursive CTEs (`WITH RECURSIVE`)

These are genuinely Snowflake-accurate *and* run in DuckDB. Most of our current gap list lives here.

### Same concept, different Snowflake name → needs the dialect layer for fidelity
| Concept | DuckDB | Snowflake |
|---|---|---|
| Regex match | `regexp_matches`, `~` | `REGEXP_LIKE`, `RLIKE` |
| Regex extract | `regexp_extract` | `REGEXP_SUBSTR` |
| Regex extract all | `regexp_extract_all` | `REGEXP_SUBSTR_ALL` |
| Higher-order | `list_transform/filter/reduce`, `x -> expr` | `TRANSFORM`, `FILTER`, `REDUCE` |
| Flatten rows | `UNNEST` | `LATERAL FLATTEN` |
| JSON path | `col->>'f'`, `col->'f'` | `col:f`, `col:f::type`, `GET_PATH` |
| Date diff | `date_diff(part,a,b)` | `DATEDIFF(part,a,b)` |
| Date add | `+ INTERVAL` | `DATEADD(part,n,d)` |

## Proposed structure: General SQL vs Snowflake courses
The content model already has a `dialect` field (only `generic` populated) and packs/tracks. Two ways to deliver "Snowflake mode":

- **Option A — DuckDB-native advanced content, `generic` dialect.** Build all the *identical-syntax* features now (rollups, joins, set ops, PIVOT, frames) as "Advanced SQL" tracks. For the name-different features, either skip for now or teach them with DuckDB names. **No new engine work.** Downside: for regex/lambda we'd show DuckDB names, not Snowflake's.
- **Option B — Snowflake dialect via transpilation.** Add a Snowflake→DuckDB transpile step (in-browser, e.g. `polyglot` WASM) so users write real `REGEXP_SUBSTR`, `TRANSFORM`, `col:field`. True fidelity, but: transpilation is best-effort, adds a dependency + failure modes, and per-dialect canonical answers. Bigger build.
- **Option C — Hybrid, phased (recommended).** Do Option A **now** for the large identical-syntax set (immediately closes most of the coverage gap, and it *is* correct Snowflake). Introduce a **`dialect: 'snowflake'`** tier later for the name-different features, powered by a transpile/validate layer — a focused, well-scoped follow-up rather than a blocker.

Under all options: keep the **coverage tracker** as the source of truth for what's built vs missing, and add a `dialect`/`course` dimension to it when Snowflake-specific lands.

## Recommendation
Adopt **Option C**. Immediately author identical-syntax advanced questions (join types, ROLLUP/CUBE/GROUPING SETS, PIVOT, set ops, window frames/NTILE, string/regex-with-DuckDB-names) to close the coverage gap and give real "advanced" depth. Treat true Snowflake-dialect fidelity (regex/lambda/JSON-path spelling) as a separate ADR-0002 follow-up when we want the "Snowflake course" to accept Snowflake syntax verbatim.

## Sources
- Snowflake: [GROUP BY ROLLUP](https://docs.snowflake.com/en/sql-reference/constructs/group-by-rollup) · [CUBE](https://docs.snowflake.com/en/sql-reference/constructs/group-by-cube) · [GROUPING SETS](https://docs.snowflake.com/en/sql-reference/constructs/group-by-grouping-sets) · [TRANSFORM](https://docs.snowflake.com/en/sql-reference/functions/transform) · [FILTER](https://docs.snowflake.com/en/sql-reference/functions/filter) · [REDUCE](https://docs.snowflake.com/en/sql-reference/functions/reduce)
- DuckDB: [GROUPING SETS/ROLLUP/CUBE](https://duckdb.org/docs/current/sql/query_syntax/grouping_sets) · [Regular expressions](https://duckdb.org/docs/current/sql/functions/regular_expressions) · [List/lambda functions](https://duckdb.org/docs/current/sql/functions/list)
