---
title: Decompose DbtWorkspace.tsx (661 lines, 21 state hooks, five concerns)
type: refactor
area: ui
priority: P2
effort: M
status: open
---

## Problem

`app/src/components/DbtWorkspace.tsx:142-605` holds 21 `useState`/`useRef` hooks spanning five unrelated concerns: file-tree CRUD (:156-161), terminal (:167-178), SQL console (:180-185), resizable layout (:187-222), and grading (:192-193). Nothing is unit-testable in isolation and any change to one concern risks the others.

## Fix sketch (the seams are already visible in the JSX)

- **`DbtTerminal`** — state :167-178 + `run()` :285-302 + JSX :546-568.
- **`DbtSqlConsole`** — state :180-185 + `runSql()` :304-320 + JSX :570-599.
- Both consume a shared **`useCommandHistory(persistedInitial)`** hook built from the already-generic `histRecall` (:350-367).
- **`WarehousePanel`** — JSX :444-463 + `OBJ_ICON`.
- **`useResizableSidebar(ref, min, max)`** — :208-222 (fix the listener-leak from issue 0008 while extracting).
- Move **`Instructions`** (:607-661) and **`FileTree`** + `buildTree` (:38-138) to their own files.

The parent keeps files/active-tab/verdict state and the cross-panel `inspect()` wiring (:323-329). Pure re-plumbing — no logic changes. Do issue 0008 (interaction bugs) either first or as part of this; issue 0012's `usePersistedState` also lands nicely here (the persistence effect at :197-206 currently re-serializes the whole file map + terminal scrollback on every keystroke — debounce it).

## Acceptance criteria

- `DbtWorkspace.tsx` under ~250 lines; extracted components/hooks in their own files with at least smoke-level tests for `useCommandHistory`.
- No behaviour change: `tests/e2e/dbt.spec.ts` green, `pnpm screenshot` diff shows the same layout.
