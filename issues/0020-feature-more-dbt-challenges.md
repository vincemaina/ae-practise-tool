---
title: Feed the Model pillar — grow from 2 to 10+ dbt challenges
type: feature
area: dbt
priority: P1
effort: M
status: open
---

## Problem

The full mini-dbt IDE shipped (engine, grading, terminal, file tree — all 4 ROADMAP phases) but carries exactly **two** challenges (`app/src/dbt/challenges/`: `stage-orders`, `incremental-orders`). A three-pillar app where the most differentiating pillar has 2 items. dbt is the "AE" in the product name; content is now just JSON authoring against an existing schema.

## Fix sketch

Author ~8 more challenges (each: sources + starter files + target + checks; see `app/src/dbt/challenge.ts` and the two existing JSONs as templates):

- Ephemeral model (CTE inlining) with a `mustUse`/materialization check.
- A staging → intermediate → mart 3-model DAG (grade the mart).
- Fix-a-broken-DAG: starter has a cycle or a bad `ref` — build fails until fixed (debug-challenge analog).
- `--full-refresh` semantics: restated/late-arriving rows where naive incremental diverges from a full rebuild (`increment` + `checks` support this).
- `{{ this }}` misuse / self-referencing incremental.
- A "right output, wrong materialization" trap beyond the existing one (e.g. table where incremental is required, view where table required).
- Multi-source join staging challenge.

Fidelity note: fix issue 0004 (double-quoted Jinja) first or alongside — new challenges will otherwise trip users on it. The bigger v2b unlock (`dbt test` / schema.yml generic tests → "make the tests pass" challenges) is deliberately **not** this issue; propose it separately per the working agreement.

## Acceptance criteria

- 10+ total challenges, each with a reference solution that self-grades green via `pnpm verify:dbt` (CI-gated).
- Challenge list UI still readable at 10+ (check `DbtChallengeList` — may need difficulty grouping).
