# Research: Browser SQL engines & dialect handling

_Research date: 2026-06-22. This is background research, **not the final decision** — a proper ≥3-option bake-off with a decision record comes next (see working practices in CLAUDE.md). Early lean noted at the end._

## The three candidates (from the brainstorm)

### DuckDB-Wasm — analytical, warehouse-like
- DuckDB (columnar OLAP engine) compiled to WASM. Built for **analytical SQL in the browser**.
- **Dialect fit is the standout**: natively supports warehouse-style syntax incl. **`QUALIFY`**, rich **window functions**, `EXCLUDE`/`REPLACE`, list/struct/JSON (semi-structured) types, `PIVOT`, etc. This is the closest feel to Snowflake/BigQuery of the three.
- Reads Parquet / CSV / JSON; speaks Arrow. Great for seeding realistic datasets.
- **Size**: full binary is large (~17 MB uncompressed) but the shell transfers ~3.2 MB compressed on first visit, then caches. Manageable for a PWA with a service worker; first-load cost is the main tradeoff.

### sql.js — SQLite, smallest, simplest
- SQLite compiled to WASM (Emscripten). ~1.2–1.5 MB wasm. Mature, simple, in-memory.
- **This is (almost certainly) what sql-practice.com uses.**
- Downside: **SQLite dialect** — weakest warehouse realism (limited window-function/analytics features vs DuckDB), so it's the opposite of our differentiator. Using it would make us "sql-practice.com again."

### PGlite — Postgres, middle ground
- Real Postgres compiled to WASM. ~3 MB gzipped. Full Postgres syntax, extensions (pgvector, PostGIS); v0.4 added connection multiplexing.
- Postgres dialect is far richer than SQLite and closer to analytics SQL, but **not warehouse-native** (no `QUALIFY`; analytics extensions differ from Snowflake/BigQuery).

## Dialect-specific correctness — the hard part

We won't execute against real Snowflake/BigQuery. Options to *simulate* dialect awareness, layered on top of whichever engine runs the query:

- **Transpilation / parsing with sqlglot** (Python) — parses & transpiles across 31+ dialects incl. Snowflake, BigQuery, DuckDB. Not browser-native (it's Python), so not directly usable client-side.
- **polyglot** (Rust → WASM, sqlglot-inspired) — transpiles between ~33 dialects **entirely in the browser**. Candidate for client-side dialect validation/transpilation without a backend.
- **Static validation** — allow/deny specific syntax per selected dialect (e.g. accept `QUALIFY` under Snowflake, reject under "generic").
- **Per-dialect canonical answers** in the content model (the brainstorm already plans for this).

Likely pragmatic MVP: run everything on **one execution engine**, present it as the dialect, and use a parse/validation layer (polyglot/static rules) to accept/reject dialect-specific syntax + per-dialect canonical solutions. Grade on **output equivalence** regardless.

## Early lean (to validate, not commit)

**DuckDB-Wasm looks like the strongest fit** because warehouse-style analytical SQL *is* the product's differentiator, and it gives us `QUALIFY`, window functions, and semi-structured/JSON types out of the box — exactly the messy-analytics surface competitors lack. The first-load bundle size is the main risk to weigh against sql.js's lightness. Decide via a real bake-off at realistic data scale.

## Sources
- [DuckDB-Wasm announcement](https://duckdb.org/2021/10/29/duckdb-wasm) · [docs](https://duckdb.org/docs/current/clients/wasm/overview) · [npm](https://www.npmjs.com/package/@duckdb/duckdb-wasm)
- [DuckDB WASM vs SQLite WASM — when to use each](https://medium.com/@kaushalsinh73/duckdb-wasm-vs-sqlite-wasm-when-to-use-each-0dc29f4a6c0c)
- [browser data-processing benchmarks (Arquero / SQLite-WASM / DuckDB-WASM)](https://github.com/timlrx/browser-data-processing-benchmarks)
- [sql.js](https://sql.js.org/)
- [PGlite](https://pglite.dev/) · [v0.4 announcement](https://electric.ax/blog/2026/03/25/announcing-pglite-v04)
- [sqlglot](https://github.com/tobymao/sqlglot) · [polyglot (Rust/WASM transpiler)](https://tobilg.com/posts/introducing-polyglot-a-rust-wasm-sql-transpilation-library/)
