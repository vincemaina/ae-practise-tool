---
title: Arrays & semi-structured II pack — transforms, array/object construction (dev feedback #19)
type: feature
area: content
priority: P1
effort: M
status: open
---

## Problem

Dev-feedback item **#19** (2026-07-11, `.dev-data/feedback.sqlite`, still open): the user hit a real work problem where `LATERAL FLATTEN` + CTEs would explode row counts, and the production solution used in-line `TRANSFORM`/`ARRAY_SORT` to pick a median image URL from an array. The bank has **zero** array/lambda questions; `COVERAGE.md`'s remaining gaps are exactly regex/lambda/flatten.

## Fix sketch

DuckDB natively supports `list_transform`, `list_filter`, `list_sort`, `unnest`, struct/`{...}` packing — so a **generic-dialect** pack (6–8 questions) is buildable now, without solving Snowflake `LATERAL FLATTEN` transpilation (ADR 0006's known hard edge):

- A dataset with array/struct columns (e.g. product image arrays with dimensions, event property lists) — follow the existing hybrid-seed pattern (~1000 rows, deterministic, special rows that make each concept bite).
- Question ideas: unnest-and-aggregate; filter-inside-array without unnesting; sort an array and take the median element (mirror the feedback story — possibly a two-question pair: flatten approach vs in-line transform); build an object/struct from columns; array containment/overlap.
- Where the Snowflake spelling is a cheap rename (`ARRAY_SIZE`→`len`, `ARRAY_SORT`, `TRANSFORM` lambda syntax differences), consider `fixupDuckDbSql` entries + `canonical.snowflake` variants — but don't block the pack on it; ship generic first.
- Add a pack entry + (optionally) a learning-path entry in `paths.ts`.

Authoring workflow: `pnpm new:question <slug>` → `pnpm verify:content` → `pnpm meta:generate` → `pnpm coverage` (see `CONTRIBUTING.md`).

## Acceptance criteria

- 6–8 questions, all green under `verify:content` (deterministic, self-grading); coverage tracker shows lambda/list features covered.
- After shipping: `python3 app/scripts/dev-feedback.py done 19 "<what shipped>"`.
