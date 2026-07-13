---
title: Close the named unit-test coverage gaps (result-mapping, transpile errors, grading edges, dbt runtime)
type: tests
area: engine
priority: P2
effort: M
status: open
---

## Problem

Specific untested branches found in review (2026-07-13):

- **`app/src/engine/result-mapping.ts` — zero unit tests** for a pure, high-leverage module: decimal scale division (:64), the Timestamp-before-Time type-ordering hazard (:69-77), bigint-micros TIME path, the `String()` struct fallback, null passthrough.
- **`app/src/engine/transpile.ts`** — the `TranspileError` branch (failure result, `errorLine` propagation, polyglot load failure) is untested; so is the string-literal false positive (issue 0005 adds that one).
- **`app/src/grading/grade.ts`** — no tests for `Date` cells, `Infinity` (issue 0006), `orderMatters` with unequal row counts, `diffResults` under `requireColumnNames`.
- **`app/src/dbt/`** — `build()`'s append strategy (no `unique_key` + filter; `engine.ts:208`), `commands.ts` `--full-refresh` parsing and dangling `-s`, `checkStructure`'s generated fallback message (`grade.ts:34-38`).
- **`app/src/engine/duckdb.ts`** — nothing at unit level: `serialize()` ordering, `ensureDataset` variant re-key, `validateSql`'s `LINE n` parsing (:293). (Partly unblocked by issue 0011's extraction.)
- **`app/src/editor/statement.ts`** — no `;`-in-literal cases (covered by issue 0003).

## Acceptance criteria

- Tests exist for each named branch (hermetic — mock the engine where needed; `result-mapping` can be tested with hand-built Arrow tables or a thin fake matching its input contract).
- All green; no reduction in existing coverage.
