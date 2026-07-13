---
title: fixupDuckDbSql rewrites function names inside string literals, corrupting data
type: bug
area: engine
priority: P1
effort: S
status: done
---

## Problem

`rewriteCall` (`app/src/engine/transpile.ts:123-145`) scans the raw SQL for call sites (`to_varchar(`, `to_char(`, `startswith(`) without string-literal awareness. `scanArgs` (which it calls) *is* quote-aware for the arguments, but the outer scan isn't — a match starting inside a `'…'` literal is rewritten.

## Failure scenario

In Snowflake dialect: `SELECT 'call to_varchar(x) for docs' AS tip` transpiles fine through polyglot, then `fixupDuckDbSql` rewrites inside the literal → `SELECT 'call CAST(x AS VARCHAR) for docs' AS tip`. The query returns wrong data and grades Incorrect with no visible reason.

## Fix sketch

Make the outer scan in `rewriteCall` skip string literals and comments — track quote state while advancing `i` (the same scanning rules `scanArgs` already implements; if issue 0003's shared literal-aware scanner lands first, reuse it). Behaviour for genuine call sites unchanged.

## Acceptance criteria

- Unit test in `transpile.test.ts` (or wherever `fixupDuckDbSql` is tested): a literal containing `to_varchar(x)` / `startswith(a,b)` passes through untouched; real calls outside literals still rewrite.
- `pnpm verify:content` green (Snowflake canonicals still transpile+match).

## Resolution

`rewriteCall` (`app/src/engine/transpile.ts`) now tracks quote/comment state
while advancing its outer scan — single-quoted string literals (with `''`
escapes), double-quoted identifiers (with `""` escapes), `--` line comments,
and `/* */` block comments are all skipped, mirroring the state machine
`editor/splitSql.ts`'s `topLevelSemicolons` already uses for top-level `;`
detection (issue 0003). `scanArgs` (used once a real call site is found) was
already quote-aware for the argument list; only the outer name-matching scan
needed the fix. Didn't import from `splitSql.ts` directly since it's scoped
to finding `;` positions, not masking arbitrary text — the same small state
machine is duplicated inline in `rewriteCall` instead.

New tests in `transpile.test.ts` cover: a call name mentioned inside a
single-quoted literal (`'call to_varchar(x) for docs'`) or a double-quoted
identifier (`AS "to_varchar(1)"`) passes through untouched; a call name
mentioned inside a `--` line comment or `/* */` block comment is left alone;
and a real call site still rewrites even when a literal elsewhere in the same
statement mentions the function name (both `to_varchar`/`to_char` and
`startswith`). All pre-existing `fixupDuckDbSql` tests stay green.

`pnpm typecheck`, `pnpm lint`, `pnpm test` (192 tests), `pnpm verify:content`,
and `pnpm verify:dbt` all green.
