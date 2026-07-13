---
title: Statement splitter breaks on `;` inside string literals — wrong query run, false squiggles
type: bug
area: editor
priority: P1
effort: M
status: done
---

## Problem

`statementAt`/`statementCount` (`app/src/editor/statement.ts:13-31`) split the document on raw `;` with no awareness of string literals or comments. This feeds the hottest editor paths: `statementForCursor` → ⌘/Ctrl+Enter and the Run button, the active-statement highlight (`activeStatement.ts`), and inline validation (`validateSql`).

The same naive split exists in `app/src/engine/duckdb.ts:60-64` (`exec`), the dbt statement splitter in `duckdb.ts` (~:99), and `app/src/dbt/challenge.ts:56-61` — those are authored-content paths gated by `verify:content`/`verify:dbt` (lower risk) but should share the fix.

## Failure scenario

Type `SELECT REPLACE(status, ';', ',') FROM orders` and hit ⌘Enter: the fragment `SELECT REPLACE(status, '` is executed and errors on a valid query. The inline linter shows a persistent false squiggle for the same reason, and `statementCount` returns 2, so the multi-statement highlight appears for a single query.

## Fix sketch

Write one quote/comment-aware scanner (single-quoted strings with `''` escapes, double-quoted identifiers, `--` line comments, `/* */` block comments) that yields top-level `;` positions. `scanArgs` in `app/src/engine/transpile.ts:62-115` already implements exactly this kind of literal-aware scanning — extract/adapt it into a small shared module (e.g. `src/editor/splitSql.ts` or `src/sql/split.ts`) and rebuild `statementAt`/`statementCount` on it. Then point `exec`, the dbt splitter, and `challenge.ts` at the same helper.

## Acceptance criteria

- New unit tests in `statement.test.ts` (or a new `splitSql.test.ts`): `;` inside single-quoted strings, `''` escapes, `--` and `/* */` comments, double-quoted identifiers, trailing `;`.
- The failure scenario runs the full statement; no false squiggle (validation path uses the same splitter).
- Existing statement-at-cursor tests still pass; `pnpm verify:content` and `pnpm verify:dbt` green.

## Resolution

Added `app/src/editor/splitSql.ts`: a quote/comment-aware scanner (single-quoted
strings with `''` escapes, double-quoted identifiers with `""` escapes, `--` line
comments, `/* */` block comments) exporting `topLevelSemicolons`,
`nextTopLevelSemicolon`, `prevTopLevelSemicolon`, `splitStatementRanges`, and
`splitStatements` (adapted from `scanArgs` in `engine/transpile.ts`, same
literal-aware-scanning idea applied to `;` instead of call-argument commas).

`statement.ts`'s `statementAt`/`statementCount` (and hence `statementForCursor`,
used by `activeStatement.ts` and `SqlEditor.tsx`'s Run/⌘Enter/inline validation)
are rebuilt on top of it; the exported API and range/trimming semantics are
unchanged, so all pre-existing tests pass without modification. The failure
scenario (`SELECT REPLACE(status, ';', ',') FROM orders`) now runs as one
statement with no false squiggle. New tests added in `splitSql.test.ts` (scanner-
level: plain semicolons, string literals, `''` escapes, double-quoted
identifiers + `""` escapes, `--`/`/* */` comments including multi-line block
comments, `next`/`prevTopLevelSemicolon`, `splitStatements`/`splitStatementRanges`)
and appended to `statement.test.ts` (cursor-in-literal cases for `statementAt`,
`statementForCursor`, and `statementCount`). `pnpm typecheck`, `pnpm lint`, and
`pnpm test` are all green (170 tests, 18 files).

**Remaining work (follow-up, tracked as issue 0005):** this task's scope was
deliberately narrowed to `app/src/editor/*` to avoid clobbering concurrently
edited files. The naive `sql.split(';')` splitters in
`app/src/engine/duckdb.ts`'s `exec` (~:60) and its dbt statement splitter
(~:99), and `app/src/dbt/challenge.ts`'s `statements` helper (~:56), were **not**
touched and still split naively on every `;`. They're lower risk (authored
setup/seed/dbt-source SQL gated by `pnpm verify:content` / `pnpm verify:dbt`
rather than live user input), but should adopt `splitStatements` from
`splitSql.ts` in a follow-up pass — the new module's `splitStatements` is a
drop-in replacement for their existing `sql.split(';').map(s => s.trim()).filter(Boolean)`
pattern.
