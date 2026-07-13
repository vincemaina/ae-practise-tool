---
title: User SQL can mutate seeded data; grading then silently passes/fails wrongly
type: bug
area: engine
priority: P1
effort: S
status: done
---

## Problem

`runQuery` (`app/src/engine/duckdb.ts:90`) executes arbitrary user SQL — including `UPDATE`/`DELETE`/`DROP`/`CREATE OR REPLACE TABLE` — against the shared `main` schema. `ensureDataset` (`app/src/engine/duckdb.ts:71-85`) only re-seeds when its cache key (`datasetId#variant`) changes, so a mutation is never repaired: it persists across Run/Submit and even across other questions on the same dataset.

Expected output is computed at runtime from the canonical solution (ADR 0003), so it is computed over the *corrupted* table too.

## Failure scenario

Open any ecommerce question → run `DELETE FROM orders;` → Submit a query that returns zero rows with the right column count. Expected (canonical over the empty table) and actual are both empty → graded **Correct**. Conversely, if the expected output was cached in React state before the mutation (`PracticeView` caches it), a genuinely correct answer grades Incorrect with a baffling diff. Every later question on that dataset stays corrupted until the cache key changes or the page reloads.

## Fix sketch

Cheapest robust option: since `setupSql` is required to be idempotent (`CREATE OR REPLACE`), re-run the seed before grading — e.g. invalidate `loadedDataset` (set it to `null`) whenever `runQuery` executed anything that isn't a plain SELECT, so the next `ensureDataset` re-seeds. Detecting "not a plain SELECT" can be conservative (regex on the first keyword after stripping comments/CTE `WITH`); false positives just cause a harmless re-seed. Alternative: always re-seed on Submit before computing expected + running the user's query.

Keep the messiness variant behaviour intact (`variant` key still applies after re-seed).

## Acceptance criteria

- The failure scenario above grades Incorrect.
- A regression test (unit-level with a mocked/real engine, or an e2e case in `tests/e2e/loop.spec.ts`): mutate → submit → correct answer still grades Correct, wrong answer Incorrect.
- `pnpm verify:content` still green (re-seed must not break determinism checks).

## Resolution

Took the fix sketch's cheapest-robust option, in two halves:

- `app/src/engine/duckdb.ts` — `runQuery` now invalidates the dataset cache (`loadedDataset = null`) before executing any statement that may mutate data. Detection is a conservative first-keyword check (`mayMutate`, after stripping comments) against a read-only allowlist (`SELECT`/`WITH`/`EXPLAIN`/`SHOW`/`DESCRIBE`/`PRAGMA`/`SUMMARIZE`/`VALUES`); false positives just cost a harmless re-seed. The messiness `variant` cache key is untouched — the next `ensureDataset` re-seeds setup + messiness under the same key as before.
- `app/src/components/PracticeView.tsx` — `getExpected()` (the shared Submit/Reveal path) now calls `ensureDataset` before computing/returning the expected output, so grading always runs against a repaired table (a no-op when nothing mutated). The `expected` cached in React state stays valid: it was computed over the same deterministic seed the re-seed restores, so it is *not* recomputed — only the table is. The seed params were factored into a small `seedOpts()` helper shared with the mount effect.

Tests: `app/src/components/PracticeView.test.tsx` (new) — a stateful fake engine simulates `DELETE FROM orders` corrupting the dataset; verifies (1) a genuinely correct answer still grades Correct after a mutation, (2) the issue's DELETE-then-submit-empty scenario now grades Incorrect, (3) `ensureDataset` is invoked on the grading path. Verified the last two fail with the fix reverted. `app/src/engine/duckdb.test.ts` (new) — mutating queries force a re-seed on the next `ensureDataset` with an unchanged cache key; `SELECT`/`WITH` don't; variant-key switching still re-seeds as before.

`pnpm verify:content` green (it uses its own node-blocking engine in `scripts/verify-content.ts`, not `src/engine/duckdb.ts`, so the re-seed logic can't affect its determinism checks — confirmed by running it).
