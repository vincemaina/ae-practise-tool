---
title: Extract the dbt runtime out of engine/duckdb.ts (inverted dependency, untested)
type: refactor
area: engine
priority: P2
effort: M
status: open
---

## Problem

`app/src/engine/duckdb.ts:6-8` imports from `../dbt/challenge`, `../dbt/engine`, `../dbt/commands` — the generic engine layer knows about the dbt product pillar. Roughly half the file (:99-263: `buildDbtTarget`, `dbtInit`, `dbtRunCommand`, `dbtQuery`, `listWarehouseObjects`) is dbt warehouse orchestration, and none of those five functions has unit coverage.

## Fix sketch

Create `app/src/dbt/warehouse.ts` and move the dbt-specific functions there. Export a small primitive from `engine/duckdb.ts` for them to build on — e.g. `withConnection(fn)` that runs `fn(conn)` through the existing `serialize` queue — so the engine module exposes generic capabilities only and the dependency points engine ← dbt, not engine → dbt. Update imports in `DbtWorkspace.tsx`, `commands.ts`, and the verify scripts.

While there, two robustness nits from review: `dbtRunCommand`'s `USE dbt_scratch` sits outside its `try` (a raw engine error escapes the `CommandResult` contract), and table/model names are interpolated unquoted into SQL (`:115`, `:213`) — quote identifiers or validate names.

## Acceptance criteria

- `engine/duckdb.ts` has no `../dbt/*` imports; file roughly halves.
- Unit tests for the moved functions (mock `withConnection`): `dbtRunCommand` compile/unknown-command paths, `listWarehouseObjects` kind mapping.
- `pnpm verify:dbt`, unit tests, and `tests/e2e/dbt.spec.ts` green.
