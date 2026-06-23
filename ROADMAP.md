# ROADMAP

High-level plan for the analytics-engineering SQL practice tool. This is the map; detailed plans/decisions live in [`decisions/`](./decisions/) and research in [`notes/research/`](./notes/research/). Keep this updated as phases ship.

Product context: see [`notes/chatgpt/brainstorm.md`](./notes/chatgpt/brainstorm.md) (intent) and [`CLAUDE.md`](./CLAUDE.md) (working agreement + practices).

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done

---

## Phase 0 — Foundations & key decisions
_Goal: settle the interlocking keystone decisions before writing app code._
- ✅ General research pass (sql-practice.com, competitors, engines) — see `notes/research/`
- ✅ Engine bake-off → decision record — **DuckDB-Wasm** (ADR 0001)
- ✅ Dialect strategy — single engine + transpile/validate/per-dialect answers, generic-first (ADR 0002)
- ✅ Expected-output strategy — compute at runtime from canonical solution (ADR 0003)
- ✅ Output-equivalence grading algorithm — design + decision record (ADR 0004)
- ✅ Tooling decisions — pnpm, Vitest, Playwright, ESLint/Prettier, TS strict (ADR 0005)

**Phase 0 complete.** Ready to start building (Phase 1) on user's go-ahead.

## Phase 1 — Walking skeleton (one question, end-to-end)
_Goal: prove the core loop with a single hardcoded question._
- ✅ Scaffold `app/` (Vite + React + TS + pnpm) around DuckDB-Wasm
- ✅ Engine boots (lazy, `eh` build, worker); runs queries; renders a results table
- ✅ Seed one realistic dataset (e-commerce orders, with non-completed orders)
- ✅ Run → Submit → grade (output equivalence) → correct/incorrect
- ✅ Reveal expected output + canonical solution (computed at runtime, ADR 0003)
- ✅ Vitest grading tests (13); `verify:content` runs the real engine over every question
- 🔶 Playwright e2e written; can't run in this sandbox (no browser system libs / no root). Covered by `verify:content` here; run `pnpm e2e` on a dev machine.

_Phase 1 verified green: typecheck + lint + 13 unit tests + content verification (real DuckDB-Wasm) + production build all pass. Found & fixed a DECIMAL-scaling bug during verification (decimals were unscaled strings)._

## Phase 2 — Content model & authoring ✅
_Goal: questions become structured, easy-to-add data, not hardcode._
- ✅ Typed Question/Dataset content schema (`content/types.ts`), one file per question
- ✅ Shared, file-seeded datasets incl. deliberately messy data (ecommerce cancelled/refunded; events has a duplicate row)
- ✅ Authoring validation (`pnpm verify:content`) runs every question on the real engine: canonical executes, deterministic, self-grades Correct, returns rows, lists generic dialect
- ✅ Question bank: **26 questions** across 8 packs (Core SQL, Joins & Aggregations, CTEs & Subqueries, Window Functions incl. `QUALIFY`, Messy Data, Funnels & Retention, Cohorts, Attribution), easy→hard, over **4 datasets** (ecommerce, events, subscriptions, marketing). All validated on the real engine via `verify:content`.

## Phase 3 — Practice UX (mostly done)
_Goal: a usable tool, not just one question._
- ✅ Question list with pack + difficulty filters and solved checkmarks
- ✅ Question view: schema preview, Run, results, Submit, Reveal, progressive hints
- ✅ **CodeMirror SQL editor**: syntax highlighting, schema-aware autocomplete (tables/columns), `⌘/Ctrl+Enter` to run, and inline error squiggles (lenient parser errors + real DuckDB validation via `EXPLAIN`)
- ✅ Minimal progress persistence (localStorage; injectable + unit-tested)
- ✅ **Premium UX pass** — semantic design tokens, light/dark theme (persisted), app shell (top bar + progress + sidebar + split workspace), difficulty badges, redesigned feedback banner + confetti on solve (reduced-motion aware), engine loading state, polished results table, theme-synced editor. Research in `notes/research/premium-ux.md`. jsdom render test added.
- ⬜ Dialect filter (deferred — only `generic` exists today)
- ⬜ Session config (ordered/random; difficulty range; multi-pack)

## Phase 4 — PWA / offline
_Goal: installable, offline-capable._
- ⬜ Service worker + asset caching (incl. the WASM binary)
- ⬜ Offline-ready practice flow

## Later (explicitly deferred — do not build without agreement)
- Snowflake / BigQuery dialect realism (validation layer + per-dialect answers)
- More advanced/hard questions at depth; sessionisation & semi-structured (JSON) packs; grow the bank
- dbt-style modelling challenges (ref/source/config/incremental/tests)
- AI explanation mode · auth · payments · marketing/SEO site (`web`/`site` folder)

### Idea backlog (captured, not scheduled)
- **Question embeddings + labels** — give each question an embedding (from its concepts / SQL features / prompt) plus structured labels, so we can measure question-to-question similarity. Uses: dedupe near-identical questions, surface "related questions", auto-cluster/curate packs, and ensure a session has good variety. Pairs well with the existing `packs`/concept tags in the content model.
- **Adaptive practice (premium)** — analyse a user's solved/attempted/incorrect history to estimate strengths & weaknesses per concept/pack, then recommend the next-best question (target weak areas, vary difficulty, space repetition). Builds on the embeddings/labels above + the localStorage progress store (which would likely graduate to richer per-attempt history). A natural paid-tier differentiator.
