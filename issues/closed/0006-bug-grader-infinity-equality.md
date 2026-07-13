---
title: Grader treats Infinity as never equal to itself
type: bug
area: grading
priority: P2
effort: S
status: done
---

## Problem

Numeric comparison in `app/src/grading/grade.ts:46` uses `abs(a-b)` with a relative epsilon; `Infinity - Infinity` is `NaN`, so `Infinity` never equals `Infinity`. If any canonical ever produces an IEEE infinity (e.g. division patterns), the question becomes unsolvable. `NaN === NaN` is already handled correctly nearby — this is the missing sibling case.

Related hardening in the same file (do together):
- `grade.ts:32` — `bigint → Number` loses precision above 2^53; add a guard or at least a comment.
- `grade.ts:134` vs `:159-176` — doc comment says the row diff is skipped when required column *names* differ, but it's still computed/returned; align comment and behaviour.

## Fix sketch

Short-circuit `a === b` (covers ±Infinity) before the epsilon math, mirroring the NaN case.

## Acceptance criteria

- Unit tests in `grade.test.ts`: `Infinity == Infinity` → equal; `Infinity != -Infinity`; `NaN` case still passes; a `Date`-cell comparison test while in there (currently untested).

## Resolution

`cellsEqual` in `app/src/grading/grade.ts` now short-circuits on `x === y` before the
epsilon math, so `Infinity === Infinity` returns `true` directly instead of falling
through to `Math.abs(Infinity - Infinity) <= eps` (`NaN <= eps` is always `false`).

That short-circuit alone wasn't sufficient: for `Infinity` vs `-Infinity`, both
`Math.abs(x - y)` and the relative epsilon (`1e-9 * Math.max(1, |x|, |y|)`) evaluate to
`Infinity`, and `Infinity <= Infinity` is `true` — a second latent false-positive with
the same root cause. Added an explicit `!Number.isFinite(x) || !Number.isFinite(y)` →
`false` guard after the NaN check (mirroring the existing NaN short-circuit) so any
non-equal, non-finite pair is rejected before reaching the epsilon comparison.

**bigint precision (`grade.ts:32`)**: kept the existing `Number(cell)` conversion —
changing it would mean comparing `bigint` values exactly while everything else in the
grader (including plain `number` cells) uses float-epsilon equality, which would make
grading behaviour depend on which JS type DuckDB happened to return for a given column
rather than only on value. Since this repo's questions don't require exact
arbitrary-precision integer equality, a comment documenting the trade-off (loses
exactness above `Number.MAX_SAFE_INTEGER` / `2^53`) is the right fix per the issue's
"guard or at least a comment" — added at the conversion site.

**`columnMismatch` doc/behaviour mismatch (`grade.ts` ~134 vs 159-176)**: kept the
current *behaviour* (the row diff is still computed and returned even when only column
*names* differ, not counts — only an actual column-count mismatch short-circuits before
the diff) and fixed the doc comment to describe it accurately. Reasoning: the "why is
this wrong" view (`DiffView`) benefits from showing which rows are missing/extra even
when the submission also has misnamed columns — silently dropping that diff whenever
`requireColumnNames` is on and a name is wrong (e.g. a harmless casing difference someone
forgot to fix) would make the incorrect-answer view strictly less informative for no
grading-correctness benefit. The field still correctly gates the boolean `columnMismatch`
flag itself; only the row-diff arrays continue past a names-only mismatch.

Added tests in `grade.test.ts`: `Infinity == Infinity` (equal), `Infinity != -Infinity`
(not equal), `NaN == NaN` still equal (and still not equal to `0`), and a `Date`-cell
comparison (same instant equal, different instant not equal).

Verified: `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:content` all green
(192 tests passed, including the 4 new ones; full content verification passed).
