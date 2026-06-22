# 0002 — Dialect strategy

**Status:** Accepted (2026-06-22)
**Date:** 2026-06-22
**Related:** [`0001-browser-sql-engine.md`](./0001-browser-sql-engine.md), [`0003-expected-output-strategy.md`](./0003-expected-output-strategy.md), [`notes/research/browser-sql-engines.md`](../notes/research/browser-sql-engines.md)

## Context

We run a single engine in the browser (DuckDB-Wasm, ADR 0001) but want the product to offer **generic / Snowflake / BigQuery** as selectable dialects, where the choice meaningfully affects what's valid and what the canonical answer looks like. DuckDB executes *DuckDB* SQL — it does **not** natively run arbitrary Snowflake/BigQuery queries. So "dialect" has to be simulated pragmatically on top of one execution engine.

## Options considered (≥3)

### A. Single engine + transpile + validate + per-dialect canonical answers
Run everything on DuckDB. To honour the selected dialect: (1) **transpile** the user's dialect SQL → DuckDB SQL before execution (sqlglot supports Snowflake/BigQuery/DuckDB; **polyglot** is a Rust/WASM transpiler that runs in-browser, no backend); (2) **statically validate** to accept/reject dialect-specific syntax; (3) store **per-dialect canonical answers** in content; (4) grade on output equivalence (dialect-agnostic).

### B. Validate/constrain only — no transpilation
Run on DuckDB, present it as "generic," and use static rules to accept/reject syntax. Questions limited to syntax DuckDB executes. Simpler, but can't truly accept Snowflake/BigQuery-only constructs — dialect is cosmetic.

### C. Multiple real engines per dialect
e.g. PGlite for a "Postgres" dialect, DuckDB for analytics. Rejected: still no real Snowflake/BigQuery in the browser, multiplies bundle size and grading complexity for little fidelity gain.

### D. Transpile-everything to a canonical internal dialect
Normalise all input to one form. Effectively a variant of A without per-dialect nuance; loses the ability to reject "invalid in this dialect," which is a feature we want.

## Decision

**Adopt approach A, phased — generic-first.**

- **MVP:** ship **"generic" dialect only** = DuckDB SQL. No transpilation layer yet. But build the architecture so the layer slots in without rework:
  - content model carries **per-dialect canonical answers** and **supported-dialects** from day one (even if only `generic` is populated at first);
  - grading is **output-equivalence**, already dialect-agnostic (see ADR 0003);
  - the execution path has a clear seam where a transpile/validate step will sit.
- **Post-MVP (incremental):** add Snowflake then BigQuery via **in-browser transpilation (polyglot)** + **static validation** for dialect-specific accept/reject, plus authored per-dialect canonical answers.

## Consequences

- **Positive:** unblocks the MVP immediately on one engine; DuckDB's native surface (`QUALIFY`, window funcs, JSON/struct) already gives a credible analytics-SQL feel under "generic"; clean path to real multi-dialect later without a rewrite.
- **Negative / honest caveats:**
  - Transpilation is **best-effort** — some Snowflake/BigQuery constructs won't translate cleanly. We do **not** promise perfect dialect fidelity; we'll scope dialect questions to what transpiles + validates reliably, and `log`/surface unsupported cases rather than silently mis-grade.
  - "Runs in DuckDB" ≠ "valid Snowflake/BigQuery" — the validation layer (not the engine) is the source of truth for dialect validity.
- **Follow-up:** when we start the dialect layer, spike polyglot's Snowflake→DuckDB and BigQuery→DuckDB coverage on our actual question set at realistic complexity before committing to it.
