---
title: dbt file-tree interaction bugs — blur commits half-typed names, no Escape, one-click delete, resize listener leak
type: bug
area: ui
priority: P2
effort: S
status: done
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

## Resolution

1. **Escape/blur:** the new-file and new-folder `onKeyDown` handlers now branch on `Enter` (commit via `addFile`/`addFolder`) vs `Escape` (`setNewName(null)`/`setNewFolder(null)`); `onBlur` now unconditionally cancels (`setNewName(null)`/`setNewFolder(null)`) instead of committing whatever was typed. Commit only happens on Enter.
2. **Delete confirm:** added `confirmDeletePath` state plus `requestDeleteFile(path)` — first click on a file's `×` arms it (button becomes `✓`, `.dbt-file-del.confirm`, title "Click again to delete"); a second click on the same file actually deletes. Clicking away (blur on the delete button) disarms it via a new `onCancelDelete` prop threaded through `FileTree`. Small CSS addition: `.dbt-file-del.confirm` (`app/src/styles.css`) keeps the armed button visible/red using existing `--danger` token — no hardcoded colors.
3. **Resize leak:** `startResize` now stores its `mousemove`/`mouseup` cleanup (which also resets `document.body.style.cursor`) in a `resizeCleanupRef`; a new `useEffect(() => () => resizeCleanupRef.current?.(), [])` runs that cleanup on unmount if a drag is still in progress.
4. **aria-label:** the delete button now has `aria-label={'Delete ' + f.path}` in addition to the (now dynamic) `title`.

Manually reasoned through the Enter→blur ordering (React unmounts the input synchronously as part of the Enter keydown's state update, so a late-firing native blur on an already-unmounted node is a harmless no-op) rather than adding a jsdom interaction test, since `DbtWorkspace` had no test file before this change and the task scoped new test coverage to the 0007 error-state path. `pnpm typecheck && pnpm lint && pnpm test` all green (194/194 tests), and `pnpm exec playwright test tests/e2e/dbt.spec.ts --project=chromium` — 8/8 passed (the spec never exercises new-file/folder, delete, or resize, so it was unaffected either way, but confirms no regression to the rest of the IDE).
