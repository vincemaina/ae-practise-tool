# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The client-side React + Vite + TypeScript PWA is built and live in `app/` — a mature SQL practice tool: DuckDB-Wasm engine, **~70 questions across 6 datasets (~1000 rows each)**, 15+ packs, output-equivalence grading with result-diff, worksheet editor (statement-at-cursor run), learning tracks + concept/dialect filters, progress/review/streak, adaptive next-question, debug challenges, PWA, a dev feedback loop, and a **Snowflake dialect layer** (write Snowflake SQL → transpiled to DuckDB in-browser via polyglot). **`app/CLAUDE.md` is the source of truth for the app** — read it for architecture, commands, and conventions. Phases 0–4 largely done; `ROADMAP.md` is the live status.

### Key docs (read these to get oriented)
- **`app/CLAUDE.md`** — the app's architecture, commands, and working conventions (start here for code work).
- `ROADMAP.md` — phased plan + live status + idea backlog. The map for what's next.
- **`issues/`** — the in-repo issue tracker (one markdown file per issue, `status:` frontmatter is authoritative). **Check for `status: open` P1s when looking for work**; follow the workflow in `issues/README.md`.
- `decisions/` — Architecture Decision Records, all **accepted** (0001 engine · 0002 dialect strategy · 0003 expected-output · 0004 grading · 0005 tooling · 0006 Snowflake transpilation).
- `COVERAGE.md` — live SQL-feature coverage (`pnpm coverage`); `notes/research/` — research incl. `snowflake-vs-duckdb.md`, `feature-ideas-2026.md`.
- `docs/dev-container.md` — run the agent's container with an isolated `node_modules` to avoid host↔container native-binary clobbering.
- `notes/chatgpt/brainstorm.md` — original product intent.

## Git — leave it to the user (hard rule)

**Never run git state-changing commands on your own** — no commit, push, branch, tag, rebase, merge, or stash. Suggest commit messages or describe the diff if useful, but do not execute. If the user explicitly says "commit this" / "push the branch", treat it as a **one-time** exception for that task only — do not adopt it as a default; wait for the user again next time. (Reason: git history is visible to others and hard to reverse; the user reviews every change before it's recorded.)

## Working environment & agent operating notes

Durable, version-controlled operating knowledge (this replaces the machine-local `~/.claude` memory, which does **not** travel between machines — this repo's `CLAUDE.md`/`ROADMAP.md`/`decisions/`/`notes/` are the source of truth for a fresh session on any PC).

- **Package manager: pnpm via corepack.** `corepack enable && pnpm install` in `app/`. `npm install` fails (a broken `apache-arrow` `bin` entry crashes npm; pnpm only warns). Version pinned via `packageManager` in `app/package.json`.
- **Native-binding clobber (host↔container shared `node_modules`).** When the repo (incl. `app/node_modules`) is shared between a host and a *different-platform* container, native deps (rolldown/esbuild/better-sqlite3) install platform-specific binaries and clobber each other. Symptom after the other side runs `pnpm install`: `Cannot find native binding` / `Cannot find module '@rolldown/binding-…'` / `ERR_PNPM_UNEXPECTED_STORE` — **only** vitest/vite build/tsx break; `tsc`/`eslint` still pass. **Fix:** `rm -rf node_modules && pnpm install` in `app/` (`CI=1` skips the purge prompt). Durable cure: the container-owned `node_modules` volume in `docs/dev-container.md`. **Note:** if host and container are the **same** arch (e.g. both Linux), this problem disappears.
- **Verify before "done" — and you CAN see the UI now.** A Playwright Chromium is cached in this environment (`~/.cache/ms-playwright/chromium-*`) and **launches successfully** (verified 2026-07-10 — the old "no browser in the sandbox" note was wrong). So the full check is `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:content && pnpm build` **plus `pnpm exec playwright test --project=chromium`** (reuses a running `pnpm dev` on :5173 via `reuseExistingServer`). For visual review, `pnpm screenshot` writes PNGs to `app/screenshots/` that you can **Read** to actually see the rendered UI — use it to self-verify layout/new views instead of asking the user. `verify:content` boots the **real DuckDB-Wasm engine** end-to-end (grades, determinism, metadata, per-dialect transpile+match); `App.test.tsx` renders the shell in jsdom (engine mocked). Genuinely interactive behavior (keyboard shortcuts, drag) can still warrant a user confirm — but layout/rendering you can now check yourself.
- **Dev feedback loop — check it proactively.** While the user runs `pnpm dev`, the app logs 👍/👎/notes + telemetry (and a **DOM→PNG screenshot** per feedback) to `.dev-data/feedback.sqlite`. Read/manage from the container with Python (no native binding needed): `python3 app/scripts/dev-feedback.py list` (also `events`, `errors`, `stats`) and `… done <id> "what changed"`. **Habit:** run `list` at the start of a session and after the user has been testing; `Read` the 📷 screenshot to see their screen; mark items `done`. This is the primary channel for UI bugs the agent can't see. Mechanics: `app/vite/dev-feedback.ts` (write) + `app/src/dev/` (app side).

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

### Key design decisions — resolved (see `decisions/`)

These early open questions are now settled; the ADRs are the record:
- **Browser SQL engine** → DuckDB-Wasm (ADR 0001).
- **Dialect strategy** → output-equivalence grading + a dialect *filter*; real dialect fidelity via in-browser transpilation, Snowflake first (ADR 0002, ADR 0006).
- **Grading** → output equivalence (never string matching), with a structured diff (ADR 0004).
- **Expected output** → computed at runtime from each question's canonical solution (ADR 0003).
- **Content model** → **JSON files, one per question/dataset** (ADR 0008), auto-discovered + Zod-validated; SQL as string or line-array. Metadata + coverage derived, not hand-authored. Contributor-facing: `CONTRIBUTING.md`, `pnpm new:question`, generated JSON Schema, CI runs `verify:content` so bad SQL can't merge.

### Intended repo structure

Single repo to start. An `app/` folder for the React/PWA tool. A separate `web`/`www`/`site` folder for marketing/SEO content may come **later** — do not create it first.

## UI terminology

Avoid the word "modes" in the UI. Prefer: dialect, warehouse, SQL engine, question pack, practice path, challenge type.

## Commands

All commands live in `app/` (see `app/CLAUDE.md` for the full list). Core loop: `pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm verify:content` (real-engine content check) · `pnpm build`. Content tooling: `pnpm meta:generate` (question metrics) · `pnpm coverage` (SQL-feature coverage → `COVERAGE.md`). Run a single test: `pnpm test <path-substring>`.
