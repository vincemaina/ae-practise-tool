---
title: Pull progress/session orchestration out of App.tsx into useProgress/useSession hooks
type: refactor
area: app
priority: P2
effort: M
status: open
---

## Problem

`app/src/App.tsx:63-192` mirrors the progress store in three separate state variables (`solvedIds`/`reviewIds`/`streak`, :66-68) that must be re-synced in lockstep by hand — `handleAttempt` (:162-167) and `onCardReview` (:136-139) each do the triple-`set` dance; forgetting one at a future call site silently stales the UI. The session-queue logic (`startSession`/`advanceSession`/`sessionIdx`/the leaving-solve-ends-session rule, :123-160) is a second coherent unit living inline.

## Fix sketch

- **`useProgress()`** (e.g. `src/storage/useProgress.ts`): wrap `progress.ts` behind `useSyncExternalStore` (add a tiny subscribe/notify to the store) so solved/review/streak can never desynchronize; components call `progress.recordAttempt(...)` and re-render automatically.
- **`useSession(navigate)`** (e.g. `src/session/useSession.ts`): owns the queue state, persistence, index derivation, and advance/exit rules.
- App.tsx drops to route-switching + wiring (~120 lines, which is what its doc comment already claims).
- Bonus: `dark` currently threads App → SolveView → PracticeView → SqlEditor/SqlBlock (:246) although `useTheme` already stamps `<html data-theme>`; a small `useThemeValue()` context deletes that plumbing across four files.

## Acceptance criteria

- No behaviour change: all `App.test.tsx` flows (list→solve→back, session counter, learn streak) green without weakening assertions.
- `handleAttempt`-style multi-set call sites are gone (single store update propagates).
