# 0008 — JSON content authoring (open-source contribution)

**Status:** Accepted (2026-07-10)
**Related:** ADR 0003 (expected-output), 0004 (grading); replaces the typed-TS-per-question content model.

## Context
To make the project easy to contribute to (open-source), adding a question should
not require writing TypeScript, editing a central registry, or running a codegen
step. The old model was one typed `.ts` file per question, hand-registered in
`content/index.ts` — a wall for non-TS contributors and a merge-conflict magnet.

## Options considered
- **JSON per question + JSON Schema (chosen).** Universal, tool-friendly; a generated
  JSON Schema gives editor autocomplete/validation. Weakness — multi-line SQL — is
  softened by allowing SQL as **either a string or an array of lines**.
- **YAML per question** — block scalars are nicest for SQL, but another syntax/dep and
  YAML type-coercion footguns.
- **Markdown + frontmatter** — most inviting for prose, but parsing multiple labeled
  SQL blocks is fiddly.
- Keep typed TS + auto-discovery — lowest effort, but still requires writing TS.

(User chose JSON.)

## Decision
Author questions/datasets as **JSON files**, auto-discovered and validated:
- **Auto-discovery:** the app loads `content/questions/*.json` + `datasets/*.json` via
  Vite `import.meta.glob` (`content/index.ts`); drop a file → it's registered, no edits.
  Node scripts load the same files from disk (`content/node.ts`) since they run outside
  Vite. Both validate through one **Zod** schema (`content/schema.ts`).
- **Schema + editor UX:** a `question.schema.json` / `dataset.schema.json` are generated
  from the Zod schema (`pnpm schema:generate`); files reference them via `$schema` for
  autocomplete + inline validation.
- **SQL** may be a string or a string[] (joined with `\n`). `requires` is data
  (`{pattern, flags, message}`) rather than a RegExp literal. `id` stays `q-<slug>`.
- **Order:** an optional `order` number preserves the curated list ordering; new
  questions without one sort last.
- **Safety net for external PRs:** CI runs `verify:content`, which executes every
  question on the real DuckDB engine and self-grades it — so broken SQL cannot merge.

## Consequences
- **Positive:** contributors add a JSON file (no TS, no registry edit, no codegen);
  editors validate as they type; CI proves each contribution runs and grades. Migration
  of all 70 questions + 6 datasets was automated and verified lossless (`verify:content`
  green; problem list renders identically).
- **Negative / mitigations:** two loaders (glob for app, fs for scripts) — kept tiny and
  sharing one validator. Derived metadata (`meta:generate`) still runs (in CI/prebuild),
  not by contributors. Multi-line SQL in JSON is less pretty than YAML — mitigated by the
  string[] form.
