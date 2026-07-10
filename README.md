# AE Practice — SQL for analytics engineers

A browser-based SQL practice platform for analytics engineers: realistic messy datasets,
warehouse-grade SQL, and a Snowflake dialect layer — broader and harder than the usual
"SQL practice" sites. **Everything runs on-device** — a real analytical database (DuckDB)
compiled to WebAssembly runs in your browser. No sign-in, no backend, offline-capable.

**▶ Live:** https://ae-practise-tool.vchapandrews.workers.dev

## Features

- **~70 questions** across 6 realistic datasets (~1000 rows each), easy → hard: joins,
  aggregation, window functions, CTEs, funnels, cohorts, attribution, sessionisation,
  semi-structured JSON.
- **Real execution + output-equivalence grading** with a structured result-diff on wrong
  answers — never string-matching.
- **Snowflake dialect** — write real Snowflake SQL (`QUALIFY`, `IFF`, `LISTAGG`,
  `STARTSWITH`, colon JSON paths…), transpiled to DuckDB in-browser.
- **Practice sessions** — build a focused, configurable run of questions.
- **Learn mode** — spaced-repetition flashcards (dbt fundamentals first).
- Progress, "needs review", daily streak, adaptive next-question; debugging challenges;
  installable PWA.

## Tech

Client-side React + Vite + TypeScript. DuckDB-Wasm engine (loaded from CDN), polyglot for
dialect transpilation, PWA via Workbox. No server. See
[`decisions/`](./decisions/) for the architecture decision records.

## Contributing

Adding a question is a **JSON file** — no code required. See
[CONTRIBUTING.md](./CONTRIBUTING.md). Every contributed question is executed and self-graded
on the real engine in CI, so the bar is "it runs and produces the right answer."

```bash
cd app
corepack enable && pnpm install
pnpm dev            # http://localhost:5173
```

## License

[MIT](./LICENSE) © 2026 Vince Maina
