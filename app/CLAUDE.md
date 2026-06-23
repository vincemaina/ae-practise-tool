# app/

The React + Vite + TypeScript PWA — the SQL practice tool itself. Phase 1 "walking skeleton": one hardcoded question proven end-to-end (run → grade → reveal). See repo `ROADMAP.md` and `decisions/`.

## Setup
Uses **pnpm** (pinned via `packageManager`). Enable it with Node's corepack: `corepack enable && pnpm install`. **`npm install` fails** — `apache-arrow` (transitive via duckdb-wasm) ships a broken `bin` entry that crashes npm but only warns under pnpm.

## Visual verification (let the agent "see" the app)
`pnpm screenshot` runs `tests/e2e/screenshots.spec.ts`, capturing key states (light, dark, correct verdict, error squiggle) to `app/screenshots/*.png` (gitignored). Those PNGs can be opened/read to review the UI — the agent's stand-in for eyes.

**Needs a Playwright browser**, which must be provided by the environment (Chromium can't be installed without root):
- **In the dev container (preferred):** bake it into the image, as root at build time —
  `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` then `RUN npx -y playwright@1.61.0 install --with-deps chromium && chmod -R 777 /ms-playwright`. Or base the image on `mcr.microsoft.com/playwright:v1.61.0-noble`.
- **On the host (stopgap):** since the repo dir is shared, run `pnpm exec playwright install chromium && pnpm screenshot` on the host; PNGs land in `app/screenshots/` for review.

## Commands (run from `app/`)
- `pnpm dev` — dev server (http://localhost:5173)
- `pnpm build` — typecheck (`tsc --noEmit`) + `vite build`
- `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest)
- `pnpm verify:content` — boots the real DuckDB-Wasm engine in Node and grades every question's canonical solution against its dataset (our ADR 0003 authoring check; also our headless stand-in for e2e).
- `pnpm e2e` — Playwright run→grade loop in a real browser. **Needs browser system libs:** `pnpm exec playwright install --with-deps chromium` (requires root; not available in the minimal CI sandbox — `verify:content` covers the engine+grading path there).
- **Definition of done:** typecheck + lint + test + verify:content green, and (where a browser is available) the Playwright loop passes with no console errors (ADR 0005).

## Layout
- `src/grading/` — **core IP.** `grade.ts` is the pure output-equivalence comparator (ADR 0004), `grade.test.ts` its unit tests, `types.ts` the `ResultSet`/`Cell` shapes.
- `src/engine/` — `duckdb.ts` boots DuckDB-Wasm (lazy, `eh` build) in a worker; all connection access is **serialized** through one queue so background validation can't race Run/Submit. `ensureDataset()` seeds, `runQuery()` runs, `validateSql()` checks a query via `EXPLAIN` (parser+binder errors, with line). `result-mapping.ts` is the pure Arrow→`ResultSet` mapper (incl. DECIMAL scaling) reused by the Node verification script.
- `src/content/` — typed content model. `types.ts` (Question/Dataset), `datasets/`, `questions/` (one file each), `index.ts` registry + `allPacks`/`difficulties`. Expected output is **computed at runtime** from each question's canonical solution (ADR 0003) — not stored.
- `src/storage/progress.ts` — localStorage solved-tracking (injectable Storage for tests).
- `src/components/` — `QuestionList` (filters + solved marks + `DifficultyBadge`), `PracticeView` (per-question split: problem panel | editor+results; mount with `key={question.id}`), `SqlEditor` (CodeMirror: DuckDB dialect highlighting, schema autocomplete, lint, theme-synced), `ResultsTable`, `DifficultyBadge`.
- `src/theme/useTheme.ts` — light/dark theme hook (persisted, defaults to OS); sets `<html data-theme>`.
- `src/App.tsx` — app shell: top bar (brand, progress bar, theme toggle), sidebar, workspace. `src/App.test.tsx` is a jsdom render smoke (engine mocked).
- `src/styles.css` — **semantic design tokens** (`--bg`/`--surface`/`--accent`/…) defined once for light + `[data-theme='dark']`. Style with tokens, not hardcoded colors, so both themes stay correct (see `notes/research/premium-ux.md`).
- `scripts/verify-content.ts` — `pnpm verify:content`; the authoring validation gate (ADR 0003).
- `tests/e2e/` — Playwright; drives the real app incl. DuckDB-Wasm in-browser.

## Conventions / gotchas
- The SQL editor is CodeMirror (`SqlEditor`). It renders a contenteditable, so e2e types into `.cm-content` (not a `<textarea>`); the `data-testid="editor"` is on the wrapper.
- DuckDB-Wasm is excluded from Vite dep pre-bundling (`vite.config.ts`); workers/wasm are imported via `?url`.
- Grading is **value-based** — column names ignored unless `requireColumnNames`, rows order-insensitive unless `orderMatters`. Don't "fix" a failing question by string-matching SQL.
- To add a question: add a dataset (idempotent `CREATE OR REPLACE` setup SQL) + a `Question` with a runnable canonical solution, and register both in `content/index.ts`.
