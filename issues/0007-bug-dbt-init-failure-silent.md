---
title: DbtWorkspace swallows dbtInit failure — user sees an empty sources list, no error
type: bug
area: dbt
priority: P2
effort: S
status: done
---

## Problem

In `app/src/components/DbtWorkspace.tsx` (~:228-241), the effect that calls `dbtInit` catches rejection and sets `sources` to `[]`: if the engine fails to boot (e.g. offline first load), the Instructions tab just shows no source tables and the workspace looks broken with **no error message at all**. Contrast `PracticeView.tsx:109`, which surfaces "Failed to load the SQL engine".

## Fix sketch

Add an error state (same pattern/copy as PracticeView's engine-error banner) and render it in the workspace instead of the silent empty list. Pairs with issue 0002 (boot retry) — once that lands, a Retry button here becomes meaningful.

## Acceptance criteria

- Mocked `dbtInit` rejection → visible error message in the workspace (assert in a component test, or extend `App.test.tsx` patterns).
- Happy path unchanged; `pnpm exec playwright test --project=chromium` green.

## Resolution

Added a `sourcesError` state in `DbtWorkspace`, set in the `dbtInit(...).catch(...)` handler with the same copy as `PracticeView`'s engine-load failure: `` `Failed to load the SQL engine: ${String(e)}` ``. Rendered as a banner (`data-testid="error"`, reusing the existing `.dbt-verdict-bar.bad` classes/tokens — no new CSS) at the top of the main IDE panel, visible regardless of which file/tab is active. `sources` is still reset to `[]` on failure so the Instructions tab doesn't get stuck on "Loading source data…" forever, but the error is now surfaced instead of being silent. Error is cleared at the start of each `dbtInit` attempt (challenge switch).

Covered by a new `src/components/DbtWorkspace.test.tsx` (mocks `../engine/duckdb`): one test asserts the banner appears with the expected copy when `dbtInit` rejects, another asserts no banner on the happy path. `pnpm exec playwright test tests/e2e/dbt.spec.ts --project=chromium` — all 8 tests pass (happy path unaffected).
