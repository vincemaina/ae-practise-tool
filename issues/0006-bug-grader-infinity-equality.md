---
title: Grader treats Infinity as never equal to itself
type: bug
area: grading
priority: P2
effort: S
status: open
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
