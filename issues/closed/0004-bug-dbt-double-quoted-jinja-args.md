---
title: mini-dbt only accepts single-quoted Jinja args; double-quoted config is silently stripped
type: bug
area: dbt
priority: P1
effort: S
status: done
---

## Problem

All the Jinja regexes in `app/src/dbt/engine.ts:38-47` hard-code single quotes (`ref(\s*'([^']+)'\s*)`, etc.), and the config extractors at `engine.ts:52` (`materialized\s*=\s*'([^']+)'`) and `:56` (`unique_key`) do too. Real dbt idiomatically uses double quotes as often as single.

Two distinct failures:
1. `{{ ref("stg_orders") }}` isn't matched by `RX.ref`, survives to the `RX.leftover` check, and throws *"unsupported or malformed Jinja"* — telling the user a supported construct is unsupported.
2. Worse: `{{ config(materialized="incremental", unique_key="id") }}` **is** matched by `RX.config` (its inner group accepts anything) so the block is stripped — but the single-quote `materialized` extraction finds nothing, the model silently defaults to `view`, and the structural check fails with *"must be materialized 'incremental'"* even though the user configured exactly that. Reads as a grader bug.

## Fix sketch

Accept either quote in the regexes, e.g. `ref\(\s*(['"])([^'"]+)\1\s*\)` and `materialized\s*=\s*(['"])([^'"]+)\1`. Same for `source` (two args), `unique_key`. Also consider `{% if is_incremental() %}…{% else %}…{% endif %}` — currently `{% else %}` fails as malformed Jinja (see 0023 misc, or fix here if cheap: capture the else-branch and drop/keep appropriately).

## Acceptance criteria

- Unit tests in `engine.test.ts`: double-quoted `ref`, `source`, `config(materialized=…, unique_key=…)` all behave identically to single-quoted.
- The silent-view failure above now builds as incremental and passes its structural check.
- `pnpm verify:dbt` green.

## Resolution

Fixed in `app/src/dbt/engine.ts`:

- `RX.ref` and `RX.source` now accept either quote character via `(['"])…\1`
  (a backreference so the closing quote must match the opener); `source()`'s
  two args can even use different quote styles independently (extra
  backreference group). `compileModel`'s `refs`/`sources` extraction and
  `renderModel`'s `.replace()` callbacks were updated for the shifted capture
  group indices (the quote char is now its own group ahead of the name).
- The `materialized=…` and `unique_key=…` extraction in `compileModel` uses
  the same `(['"])…\1` pattern, so `{{ config(materialized="incremental",
  unique_key="id") }}` now resolves identically to the single-quoted form
  instead of silently defaulting to `view`.
- Also implemented `{% if is_incremental() %}…{% else %}…{% endif %}`
  properly (not just noted as risky): `RX.incr` gained an optional
  `(?:\{%-?\s*else\s*-?%\}([\s\S]*?))?` group between the if-body and
  `endif`. `renderModel` now picks the if-branch when building incrementally
  and the else-branch (or empty string, preserving old behavior) otherwise —
  so both branches render correctly per mode, not just "keep both / drop
  both". This closes the else-branch portion of issue 0023 as well; that
  issue's file should be checked and can likely be closed/updated too since
  the specific `{% else %}` failure it flagged no longer reproduces.

Files touched: `app/src/dbt/engine.ts`, `app/src/dbt/engine.test.ts`, this
issue file.

New/updated tests in `engine.test.ts` (all passing):
- `compileModel`: double-quoted `config(materialized=…, unique_key=…)`,
  double-quoted `ref()`, double-quoted `source()`, and `source()` with mixed
  quote styles across its two args.
- `renderModel`: double-quoted `ref()`/`source()` resolve identically to
  single-quoted; a new `{% if is_incremental() %} / {% else %}` describe
  block covering if-branch on incremental build, else-branch on full build,
  and the no-`{% else %}` case still dropping the block entirely on a full
  build (regression guard for the pre-existing behavior).
- `build`: the exact issue repro — a double-quoted `config()` — now builds
  as `CREATE OR REPLACE TABLE mart AS …` (not a view) on first run, and
  upserts via delete+insert on a second run against an existing table.

Verification: `pnpm typecheck`, `pnpm lint`, and `pnpm test src/dbt` (42
tests, all dbt-scoped suites) all green; `pnpm verify:dbt` passes both
authored challenges. The full unversioned `pnpm test` run had 4 unrelated
failures in `src/editor/splitSql.test.ts` / `statement.test.ts` — those files
were being concurrently modified by another agent in this session and were
not touched here.
