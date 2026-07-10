# 0006 — Snowflake dialect support via in-browser transpilation

**Status:** Accepted (2026-06-28)
**Date:** 2026-06-28
**Related:** [`0001-browser-sql-engine.md`](./0001-browser-sql-engine.md), [`0002-dialect-strategy.md`](./0002-dialect-strategy.md); research in [`notes/research/snowflake-vs-duckdb.md`](../notes/research/snowflake-vs-duckdb.md)

## Context
We execute on DuckDB-Wasm but want users to write **real Snowflake SQL** (`LATERAL FLATTEN`, `col:field` colon access, `REGEXP_SUBSTR`, `IFF`, `DATEADD`, …). This is the ADR-0002 dialect-fidelity work, previously deferred. Grading stays output-equivalence, so the only new requirement is: **make the user's Snowflake SQL execute and produce rows**.

## Empirical findings (measured 2026-06-28)
**DuckDB-Wasm already accepts a large slice of Snowflake syntax natively** — `QUALIFY`, `SELECT * EXCLUDE/REPLACE`, `GROUP BY ALL`, `DATEDIFF(part,a,b)`, `LISTAGG`, `ARRAY_AGG`, `::` cast, `TRY_CAST`. (DuckDB pioneered several "friendly SQL" features Snowflake also has.)

**What DuckDB rejects → needs transpiling:** `IFF`, `NVL`, `DATEADD`, `TO_VARCHAR`, `REGEXP_SUBSTR`, `col:field` colon JSON, `LATERAL FLATTEN`, `TOP n`.

**polyglot (`@polyglot-sql/sdk`, Rust→WASM, sqlglot-compatible) transpiles Snowflake→DuckDB in-browser.** Tested those 8: 6 transpile *and run* end-to-end (`IFF`→CASE, `NVL`→COALESCE, `DATEADD`→+INTERVAL, `REGEXP_SUBSTR`→REGEXP_EXTRACT, `col:x`→`->'$.x'`, `TOP n`→LIMIT). 2 are the hard edges: `TO_VARCHAR` (left unmapped) and `LATERAL FLATTEN` (transpiles but Snowflake's 6-column FLATTEN semantics don't map cleanly onto DuckDB `UNNEST`).

## Options considered (≥3)
- **A. polyglot transpile (chosen).** User's Snowflake SQL → polyglot → DuckDB → execute → grade. In-browser, mature (10k+ sqlglot fixtures), ~4 MB gz wasm (lazy-loaded only when a non-generic dialect is active). Best-effort: a few constructs won't transpile.
- **B. sqlglot in Pyodide.** Battle-tested Python transpiler, but Pyodide is ~10 MB+ and loading Python-in-browser is heavyweight for one function. Rejected on weight/complexity.
- **C. DuckDB-native only + hand-written shim.** Lean on DuckDB's native Snowflake coverage, hand-map the ~8 gaps with regex/string fixups. Lightest, but reinventing a worse transpiler; brittle on anything we didn't anticipate. Rejected — polyglot is a maintained superset of this.

## Decision
Adopt **A**: a transpile layer using polyglot. When the active dialect ≠ generic, transpile the user's SQL to DuckDB before executing; grade the output as usual against the (DuckDB) canonical. polyglot is **lazy-loaded** so generic users never download it. Author the first Snowflake questions using constructs that transpile cleanly (colon access, `REGEXP_SUBSTR`, `IFF`, `DATEADD`, …); avoid `FLATTEN`/`TO_VARCHAR` until we add targeted fixups.

## Consequences
- **Positive:** real Snowflake SQL practice with genuine grading, no backend; reuses existing output-equivalence grading and the dialect *filter* (ADR 0002 groundwork). Generic experience unchanged and unweighted.
- **Negative / mitigations:**
  - **Best-effort transpile.** Some constructs fail or mis-transpile (`FLATTEN`, `TO_VARCHAR`). Mitigate: transpile errors surface as a clear "couldn't parse this as Snowflake" message (distinct from SQL errors); scope early content to what works; add small pre/post fixups for high-value gaps later.
  - **~4 MB gz lazy payload** on first Snowflake use. Acceptable (one-time, cached; only for opted-in dialect users).
  - **Grading correctness depends on transpile correctness.** A wrong transpile could mis-grade. Mitigate: the authoring/verify harness can transpile each Snowflake question's *own* Snowflake-authored solution and confirm it matches the canonical output.
- **Follow-ups:** thread the active dialect into the solve view/engine; lazy-load polyglot; graceful transpile errors; author Snowflake showcase questions; extend `verify:content` to check Snowflake solutions transpile+match.

## Update 2026-07-10 — a small post-transpile fixup pass

Re-probed the 34 most common Snowflake constructs through the **actual** transpile→execute path (not just transpile). **28/34 run end-to-end today**, and the ADR's feared colon-JSON access now transpiles *and runs*. Six still fail — but three are trivial spelling gaps polyglot passes through verbatim, so `fixupDuckDbSql` (in `engine/transpile.ts`, applied after polyglot in both `toDuckDB` and `verify:content`) rewrites them:
- `TO_VARCHAR(x)` / `TO_CHAR(x)` (1-arg) → `CAST(x AS VARCHAR)`
- `STARTSWITH(a, b)` → `starts_with(a, b)`

The pass is a conservative, balanced-paren, unit-tested string rewrite (`transpile.test.ts`) — safe on any dialect's DuckDB output. It intentionally does **not** touch the genuinely hard edges, which stay deferred and surface as normal transpile/run errors:
- `LATERAL FLATTEN` — Snowflake's 6-column FLATTEN doesn't map onto DuckDB `UNNEST`.
- `TO_VARCHAR(x, fmt)` date formatting — needs a Snowflake→`strftime` format-token map.
- `col:field::string` **text** colon access — polyglot emits `CAST(… -> 'path' AS TEXT)`, which keeps JSON quotes (should be `->>`). Numeric colon casts (`::int`/`::decimal`) are unaffected and used by the JSON showcase question.
- `RATIO_TO_REPORT` — no DuckDB equivalent function.

This shipped alongside a Snowflake pack grown from 3 → 12 questions (NVL/NVL2, DATEADD/DATEDIFF, LISTAGG, QUALIFY, MEDIAN, numeric colon-JSON, plus the two fixup-unlocked functions), each machine-verified transpile+match by `verify:content`.
