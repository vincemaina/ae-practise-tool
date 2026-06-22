# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This is a **greenfield project**. There is no application code yet — only `.idea/` IDE config and a brainstorm document at `notes/chatgpt/brainstorm.md`. Read that document first: it is the single source of product intent.

**Stack is decided: a client-side React + Vite + TypeScript PWA.** (Earlier Python `uv` scaffolding has been removed; ignore the stale Python SDK reference still in `.idea/misc.xml`.) The app (`app/`) is not yet scaffolded — discuss setup with the user before generating it.

### Key docs (read these to get oriented)
- `notes/chatgpt/brainstorm.md` — product intent (the original brainstorm).
- `ROADMAP.md` — phased plan + current status. The map for what's next.
- `decisions/` — Architecture Decision Records (one per meaningful choice). `0001` = engine (DuckDB-Wasm, proposed).
- `notes/research/` — general research (sql-practice.com, competitors, engines).

## Git — leave it to the user (hard rule)

**Never run git state-changing commands on your own** — no commit, push, branch, tag, rebase, merge, or stash. Suggest commit messages or describe the diff if useful, but do not execute. If the user explicitly says "commit this" / "push the branch", treat it as a **one-time** exception for that task only — do not adopt it as a default; wait for the user again next time. (Reason: git history is visible to others and hard to reverse; the user reviews every change before it's recorded.)

## Working agreement (from the brainstorm — treat as binding)

The brainstorm is an unreviewed context dump, **not a spec**. The user explicitly wants collaboration, not blind implementation:

- **Discuss major architectural or product decisions before implementing them.** Challenge assumptions and propose better approaches.
- Don't treat any feature or design in the brainstorm as final.
- Present trade-offs and ask before committing to big technical choices (e.g. the browser SQL engine).

## Working practices

These conventions come from `claude-best-practices.md` (read it for the full reasoning). Follow them as the project grows:

- **Research before building.** Do a quick web-research pass before non-trivial work, especially when using an external tool/library/API. Web research measurably improves output here.
- **Compare ≥3 options before any meaningful architectural decision** (SQL engine, content/data model, sync/storage approach, etc.). Weigh them — ideally with a quick spike — not just prose. Record what was compared, what was chosen, and why in a plan/research doc; that doc is the decision record.
- **Plan first, and commit the plan.** Write a plan before coding (plan mode is fine, but persist meaningful plans as files in git as a decision log). Couple plans to the roadmap.
- **Roadmaps drive the work.** Maintain a high-level `ROADMAP.md` that links to per-phase/per-feature roadmap files; keep it updated as things ship.
- **`CLAUDE.md` in every subfolder** (experiment in progress): each folder gets a `CLAUDE.md` describing its files and subfolders. Plan to add a test that enforces both the presence of these files and that they reference everything in the folder.
- **Tests guard code *and* practices.** Build a fast, hermetic test suite to catch regressions; also use tests to enforce agent conventions (e.g. the per-folder `CLAUDE.md` rule above).
  - **Keep tests hermetic** — every external-API-backed subsystem (LLM, embeddings, search) needs a deterministic fake that's forced ON in tests; add the fake in the *same* change as the subsystem. Watch for slow test runs as a sign of a real-API leak.
  - **Test at realistic scale and shape**, not toy data — behaviours (fragmentation, O(n²), latency) can reverse between 16 items and thousands.
- **Persist user data before best-effort enrichment.** Commit the core/user-facing result first; do derived work (indexing, AI titles, embeddings) afterwards as best-effort so a failure there can't lose user data.
- **Close the loop end-to-end.** Prefer to verify your own work against the running product before reporting done — for this web app that means driving it in a browser (e.g. Playwright) and adding end-to-end tests alongside unit/integration tests.
- **Build skills as you go.** When you learn how to work with an external tool/API/package, capture it as a reusable skill (research → write the skill → it's available next session).
- **Use subagents for parallel/independent work** to keep each context window focused; spin them up for exploration or batch tasks.

## Product vision

A browser-based SQL practice platform for analytics engineers — broader, harder, and more dialect-specific than sql-practice.com, with realistic messy datasets and eventually dbt-style practice. It is both a personal interview-prep tool and a potential public product (ads/SEO/paid tier later).

### MVP scope and explicit non-goals

Build the **client-side practice tool first** — no sign-in, no backend, no server requests; everything runs in the browser, offline-capable via service worker.

Core loop: pick dialect/warehouse + question pack → see schema/data + a natural-language task → write SQL in an editor → Run → see results → Submit → graded correct/incorrect → reveal expected output and canonical solution.

Do **not** build (until explicitly agreed): the marketing/SEO site, AI explanation mode, authentication, payments, or a full dbt IDE. Design so dbt-style challenges can be added later without a rewrite, but don't build them first.

### Key design decisions to make (open questions)

- **Browser SQL engine** — candidates: DuckDB-Wasm, sql.js, PGlite. Research and recommend with trade-offs before choosing.
- **Dialect-specific correctness** — Generic SQL first; Snowflake and BigQuery planned. The selected dialect must affect what counts as valid/correct (e.g. accept Snowflake `QUALIFY` only under Snowflake). Since the app won't execute against real warehouses, this must be simulated pragmatically (dialect constraints, static validation, transpilation, dialect-specific canonical answers).
- **Grading** — use **output equivalence**, never SQL string matching. Account for column names/order, row order (only when the question requires it), numeric tolerance, nulls, duplicate rows, type differences, and non-determinism.
- **Content model** — questions/datasets/packs/dialects as structured TypeScript/JSON files, designed so the user can add new questions easily. See the brainstorm for the full proposed question schema (id, slug, difficulty, packs, supported dialects, seed data, expected output, per-dialect canonical solutions, validation rules, etc.).

### Intended repo structure

Single repo to start. An `app/` folder for the React/PWA tool. A separate `web`/`www`/`site` folder for marketing/SEO content may come **later** — do not create it first.

## UI terminology

Avoid the word "modes" in the UI. Prefer: dialect, warehouse, SQL engine, question pack, practice path, challenge type.

## Commands

None yet — the Vite project hasn't been scaffolded. Once `app/` exists, document the dev/build/test/lint commands here (and how to run a single test).
