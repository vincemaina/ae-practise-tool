---
title: DbtWorkspace swallows dbtInit failure — user sees an empty sources list, no error
type: bug
area: dbt
priority: P2
effort: S
status: open
---

## Problem

In `app/src/components/DbtWorkspace.tsx` (~:228-241), the effect that calls `dbtInit` catches rejection and sets `sources` to `[]`: if the engine fails to boot (e.g. offline first load), the Instructions tab just shows no source tables and the workspace looks broken with **no error message at all**. Contrast `PracticeView.tsx:109`, which surfaces "Failed to load the SQL engine".

## Fix sketch

Add an error state (same pattern/copy as PracticeView's engine-error banner) and render it in the workspace instead of the silent empty list. Pairs with issue 0002 (boot retry) — once that lands, a Retry button here becomes meaningful.

## Acceptance criteria

- Mocked `dbtInit` rejection → visible error message in the workspace (assert in a component test, or extend `App.test.tsx` patterns).
- Happy path unchanged; `pnpm exec playwright test --project=chromium` green.
