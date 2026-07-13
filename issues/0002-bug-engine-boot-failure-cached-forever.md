---
title: Failed lazy engine/polyglot boot is memoized forever — one CDN blip bricks the session
type: bug
area: engine
priority: P1
effort: S
status: done
---

## Problem

`getDb`/`getConn` (`app/src/engine/duckdb.ts:27-57`) and the polyglot loader (`app/src/engine/transpile.ts:38-48`, `polyPromise`) memoize the **promise**, not the resolved value. If the first fetch of the DuckDB wasm (jsDelivr) or the polyglot wasm rejects — flaky wifi on first visit, before the service worker has cached anything — the rejected promise is handed to every subsequent caller.

## Failure scenario

First visit on a poor connection → jsDelivr fetch fails once → `PracticeView` shows "Failed to load the SQL engine" → user's connection recovers → every question still shows the same error until a full page reload. Same for the Snowflake dialect via `polyPromise`.

## Fix sketch

Clear the memo on rejection so the next call retries:

```ts
dbPromise = (async () => { ... })();
dbPromise.catch(() => { dbPromise = null; });
```

Apply the same pattern to `connPromise` (which chains `getDb`) and `polyPromise` in `transpile.ts`. Optionally surface a "Retry" affordance in `PracticeView`'s engine-error state, which will now actually work.

## Acceptance criteria

- Unit test: a loader whose first invocation rejects and second resolves → second call to the public API succeeds (inject the failure by mocking `duckdb.selectBundle` / the polyglot import).
- No change to happy-path behaviour (still boots once, still lazy).

## Resolution

Applied the fix sketch: each memoized loader promise now clears itself on rejection (`promise.catch(() => { promise = null; })`) so the next caller retries instead of receiving the same dead promise.

- `app/src/engine/duckdb.ts` — `dbPromise` (in `getDb`) and `connPromise` (in `getConn`) self-clear on rejection.
- `app/src/engine/transpile.ts` — `polyPromise` (in `loadPolyglot`) self-clears on rejection.
- Tests: `app/src/engine/duckdb.test.ts` (new) — bundle-fetch rejects once then succeeds; `connect()` rejects once then succeeds; happy path still boots exactly once (mocked `@duckdb/duckdb-wasm`, stubbed `Worker`, `vi.resetModules()` per test since the memo is module state). `app/src/engine/transpile.test.ts` — polyglot `init()` rejects once then succeeds; happy path loads the wasm once (mocked `@polyglot-sql/sdk`).

Not done (left as the issue's "optionally"): a dedicated "Retry" button in `PracticeView`'s engine-error state — but re-opening/re-mounting the question now genuinely retries, whereas before only a full reload did.
