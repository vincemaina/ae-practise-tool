---
title: usePersistedState hook — replace six hand-rolled localStorage try/catch blocks
type: refactor
area: app
priority: P2
effort: S
status: open
---

## Problem

The shape `try { localStorage.… } catch { /* ignore */ }` with an optional validator is hand-written at least six times: `app/src/App.tsx:31-61` (`readName`/`readDialect`/`readSession`) plus their write-side twins (:76-109), and `app/src/components/DbtWorkspace.tsx:147-154` + :197-206. The DbtWorkspace persistence effect also re-serializes the entire file map + full terminal scrollback **on every editor keystroke**.

## Fix sketch

A ~15-line `usePersistedState<T>(key, initial, { parse?, serialize?, debounceMs? })` hook (new file, e.g. `src/storage/usePersistedState.ts`): lazy read with fail-soft parse, debounced fail-soft write. Adopt it in App.tsx (name, dialect, session) and DbtWorkspace (files, terminal history — with a debounce). Leave `storage/progress.ts` and `learn/store.ts` alone — they're deliberate injectable-Storage modules with their own tests.

## Acceptance criteria

- Hook unit-tested (quota-throw → no crash; invalid JSON → initial; debounce coalesces writes).
- ~60 lines of App.tsx boilerplate gone; DbtWorkspace no longer serializes per keystroke.
- Existing App.test.tsx flows green.
