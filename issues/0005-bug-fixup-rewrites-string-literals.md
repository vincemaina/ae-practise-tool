---
title: fixupDuckDbSql rewrites function names inside string literals, corrupting data
type: bug
area: engine
priority: P1
effort: S
status: open
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
