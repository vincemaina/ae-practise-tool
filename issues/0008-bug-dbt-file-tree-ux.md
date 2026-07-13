---
title: dbt file-tree interaction bugs — blur commits half-typed names, no Escape, one-click delete, resize listener leak
type: bug
area: ui
priority: P2
effort: S
status: open
---

## Problem

Four small interaction bugs in `app/src/components/DbtWorkspace.tsx`:

1. **New file/folder input commits on blur** (:426, :438) and there is no Escape-to-cancel path — clicking away while deciding creates e.g. `models/new_mo` for real, and it's immediately persisted to localStorage. Escape should cancel (`setNewName(null)`), blur should probably cancel too (commit on Enter only).
2. **File delete is a single unconfirmed click** on a 14px `×` (:131, :276), immediately persisted, no undo. Add a confirm (or an undo toast).
3. **Sidebar resize leaks listeners** (:210-222): `startResize` adds window `mousemove`/`mouseup` listeners with no unmount cleanup; if the component unmounts mid-drag the listeners leak and `document.body.style.cursor` stays `col-resize`. No touch events either.
4. The `×` button's accessible name relies on `title` alone — add `aria-label={'Delete ' + f.path}` (:131).

## Acceptance criteria

- Escape while naming a file cancels; blur no longer creates half-typed files.
- Deleting a file requires a confirm (or is undoable).
- Resize handlers are removed on unmount (effect cleanup); cursor restored.
- Playwright dbt spec still green (`tests/e2e/dbt.spec.ts`).
