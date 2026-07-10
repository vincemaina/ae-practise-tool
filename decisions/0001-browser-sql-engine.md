# 0001 — Browser SQL execution engine

**Status:** Accepted (2026-06-22)
**Date:** 2026-06-22
**Note:** Accepted on the understanding that multi-dialect support (Snowflake/BigQuery patterns) is delivered by a **layer on top** of DuckDB, not by DuckDB natively executing those dialects — see [`0002-dialect-strategy.md`](./0002-dialect-strategy.md).
**Related:** [`notes/research/browser-sql-engines.md`](../notes/research/browser-sql-engines.md), ROADMAP Phase 0

## Context

The app runs SQL entirely client-side (no backend) in a PWA. The engine choice gates dialect realism, dataset seeding, expected-output generation, and bundle/first-load cost. Our differentiator vs sql-practice.com and others is **analytics-engineering SQL**: window functions, `QUALIFY`, semi-structured/JSON, messy realistic data, and eventually Snowflake/BigQuery feel.

## Options considered (≥3)

### A. DuckDB-Wasm — columnar OLAP, warehouse-like
- **Dialect:** native `QUALIFY`, rich window functions, `PIVOT`, `EXCLUDE`/`REPLACE`, list/struct/JSON types — the closest feel to Snowflake/BigQuery. Directly serves the differentiator.
- **Data seeding:** reads Parquet / CSV / JSON natively; speaks Arrow → easy to seed realistic, messy datasets.
- **Size (measured 2026-06-22, gzipped):** `duckdb-eh.wasm` **7.74 MB gz** (34.3 MB raw) + worker/glue ≈ **~7.9 MB gz** total first load. `mvp` fallback build is larger.

### B. sql.js — SQLite compiled to WASM
- **Dialect:** SQLite. Weakest analytics surface (limited window/analytics features); **this is what sql-practice.com uses** — choosing it risks rebuilding the thing we're trying to beat.
- **Size (measured):** `sql-wasm.wasm` **0.31 MB gz** (0.6 MB raw). By far the lightest.
- Mature, simple, in-memory.

### C. PGlite — Postgres compiled to WASM
- **Dialect:** real Postgres — far richer than SQLite, closer to analytics SQL, but **not warehouse-native** (no `QUALIFY`; analytics extensions differ from Snowflake/BigQuery).
- **Size (measured):** `pglite.wasm` 3.25 + `pglite.data` 1.77 + `initdb.wasm` 0.14 = **~5.2 MB gz**.

### Size comparison (measured, gzipped first-load transfer)
| Engine | gz payload | vs sql.js |
|---|---|---|
| sql.js | ~0.31 MB | 1× |
| PGlite | ~5.2 MB | ~17× |
| DuckDB-Wasm | ~7.9 MB | ~25× |

_Caveats: measured with `gzip` on package versions duckdb-wasm 1.33.x, sql.js 1.14.x, pglite 0.5.x. CDNs typically serve **Brotli**, which compresses WASM noticeably better — real-world transfer will be lower than these gz figures (an external DuckDB shell figure cited ~3.2 MB). All are **one-time, cacheable** (service worker / HTTP cache); not paid per query or per session._

## Decision

**Adopt DuckDB-Wasm.**

Rationale: dialect/feature fit *is* the product. DuckDB is the only candidate whose SQL natively covers the analytics-engineering surface (window functions, `QUALIFY`, semi-structured/JSON, `PIVOT`) and whose Parquet/CSV/JSON ingestion makes seeding realistic messy datasets easy. sql.js would make us a sql-practice.com clone (its core weakness is exactly our differentiator); PGlite is a reasonable middle ground but still lacks warehouse-native syntax while costing ~5 MB anyway — so it pays much of the size cost without the dialect win.

The ~8 MB first-load is the real cost. We accept it because it is one-time and cacheable, and the target audience (analytics engineers on desktop) tolerates a one-off load far better than a weak SQL dialect.

## Consequences

- **Positive:** warehouse-grade SQL from day one; easy messy-dataset seeding; `QUALIFY`/window/JSON available for hard questions; DuckDB SQL is a sane base to later map Snowflake/BigQuery dialect rules onto.
- **Negative / to mitigate:**
  - First-load weight (~8 MB gz). Mitigate: service worker precache + Brotli at the CDN; lazy-load the engine after first paint; show a load indicator. Revisit in Phase 4.
  - DuckDB SQL ≠ Snowflake/BigQuery exactly → the **dialect strategy** (next decision) must layer validation/per-dialect canonical answers on top; don't conflate "runs in DuckDB" with "valid Snowflake."
- **Follow-ups:** confirm Brotli first-load size during scaffolding; verify Web Worker execution keeps the UI responsive; benchmark at realistic data scale (not toy tables) per our practices.

## Update 2026-07-10 — serve the DuckDB wasm from jsDelivr, not self-hosted

Deploying the built app to Cloudflare surfaced a hard limit: Cloudflare caps any
single static asset at **25 MiB**, but DuckDB-Wasm's binaries are larger
(`duckdb-mvp.wasm` 37.5 MiB, `duckdb-eh.wasm` 32.7 MiB at v1.32.0). You can't
split a `.wasm`, so **self-hosting the engine on Cloudflare is impossible**.

Options weighed: (a) load the wasm from **jsDelivr** (`duckdb.getJsDelivrBundles()`);
(b) host it on **Cloudflare R2** (object storage, no 25 MiB cap); (c) move to a host
without the limit (GitHub Pages, ~100 MiB/file). **Chose (a)** — smallest change,
fastest to green, and it offloads the heavy first-load bandwidth to jsDelivr's CDN.

Change: `engine/duckdb.ts` now boots via `getJsDelivrBundles()` + `selectBundle`
(still prefers the single-threaded `eh` build, so no cross-origin-isolation headers),
instantiating the cross-origin worker through a same-origin `Blob`/`importScripts`
shim. The `?url` self-hosted imports are gone, so Vite no longer emits the DuckDB
wasm into `dist` (the only self-hosted wasm left is polyglot, 17.9 MiB — under the cap).

**Trade-off (supersedes the "one-time, cacheable, self-hosted" framing above):** first
load now depends on jsDelivr being reachable. The **offline** story still holds — the
service worker `CacheFirst`-caches the `@duckdb` CDN path (see `vite.config.ts`), so the
engine works offline after one successful load. If a hard "no third-party origins"
requirement ever appears, switch to option (b) R2 (self-hosted URLs, same code shape).
