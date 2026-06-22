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
- ⬜ Scaffold `app/` (Vite + React + TS) around the chosen engine
- ⬜ Engine boots in-browser; can run a hardcoded query and render a results table
- ⬜ Seed one realistic dataset
- ⬜ Run → Submit → grade (output equivalence) → correct/incorrect
- ⬜ Reveal expected output + canonical solution
- ⬜ Vitest set up; grading comparator unit-tested; one Playwright e2e of the loop

## Phase 2 — Content model & authoring
_Goal: questions become structured, easy-to-add data, not hardcode._
- ⬜ Question/dataset/pack content schema (typed)
- ⬜ Datasets as shared, file-seeded resources (incl. deliberately messy data)
- ⬜ Authoring convention + validation test that runs every question end-to-end
- ⬜ Author the first small batch of questions (generic dialect)

## Phase 3 — Practice UX
_Goal: a usable tool, not just one question._
- ⬜ Question list with pack / difficulty / dialect filters
- ⬜ Question view: schema/data preview, editor (CodeMirror?), results, submit, reveal
- ⬜ Session config (ordered/random; difficulty range; packs)
- ⬜ Minimal progress persistence (localStorage/IndexedDB)

## Phase 4 — PWA / offline
_Goal: installable, offline-capable._
- ⬜ Service worker + asset caching (incl. the WASM binary)
- ⬜ Offline-ready practice flow

## Later (explicitly deferred — do not build without agreement)
- Snowflake / BigQuery dialect realism (validation layer + per-dialect answers)
- Advanced/hard question tiers at depth; analytics packs (funnels, retention, cohorts, attribution, sessionisation, messy/semi-structured data)
- dbt-style modelling challenges (ref/source/config/incremental/tests)
- AI explanation mode · auth · payments · marketing/SEO site (`web`/`site` folder)
