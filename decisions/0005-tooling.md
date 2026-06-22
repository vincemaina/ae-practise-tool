# 0005 — Tooling & project setup

**Status:** Accepted (2026-06-22) — to be confirmed/applied at scaffold time
**Date:** 2026-06-22
**Related:** ROADMAP Phase 0 / Phase 1, [`0001-browser-sql-engine.md`](./0001-browser-sql-engine.md)

## Context

Stack is React + Vite + TypeScript PWA (CLAUDE.md). We need conventional, low-friction tooling that supports a fast hermetic test suite and end-to-end self-verification (per working practices), and that plays well with DuckDB-Wasm (web workers + wasm).

## Decisions

| Concern | Choice | Why |
|---|---|---|
| **Package manager** | **pnpm** | Fast, disk-efficient; clean workspace story if/when a `web/` (marketing) package is added later. |
| **Build / dev server** | **Vite** | Already decided; first-class wasm + web-worker support DuckDB-Wasm needs. |
| **Language** | **TypeScript, `strict: true`** + `noUncheckedIndexedAccess` | We index heavily into query result rows/columns — unchecked indexing would be a real bug source. |
| **Unit/integration tests** | **Vitest** (+ React Testing Library for components) | Vite-native, fast feedback; the grading comparator and content-validation tests live here. |
| **End-to-end** | **Playwright** | Drives the real app incl. DuckDB-Wasm in a real browser — enables the agentic self-verification loop and proves the run→grade flow end-to-end. |
| **Lint** | **ESLint** (flat config) + typescript-eslint, react-hooks, react-refresh | `react-hooks` catches real bugs; ships with the Vite React-TS template. |
| **Format** | **Prettier** | Conventional, zero-debate formatting. |

> Single tool alternative (Biome) was considered for speed; rejected for MVP in favour of ESLint's mature `react-hooks` coverage. Revisit if lint/format speed becomes a pain.

## "Definition of done" gate (run before declaring work complete)

`typecheck` (tsc) + `lint` + `vitest` all green, and the relevant Playwright flow passes with no console errors. CI wiring can come later (the user manages git/CI); locally this is the self-verify bar.

## Hermetic-tests note

MVP has **no external API** — DuckDB (and later the polyglot transpiler) run as local in-process WASM, so the suite is naturally hermetic and offline. The "force a fake ON in tests" practice only becomes relevant if/when we add a network-backed feature (e.g. the deferred AI explanation mode) — add its fake in the same change at that time.

## Known build-integration gotchas (verify during scaffold)

- DuckDB-Wasm loads a worker + `.wasm`; use Vite's worker/asset handling and the package's bundle helpers. Prefer the `eh` build (ADR 0001) — it avoids requiring cross-origin isolation (COOP/COEP) that the threaded `coi` build needs.
- Lazy-load the engine after first paint and show a loading state (the ~8 MB first load from ADR 0001).
- Defer the service worker / PWA plugin until the core loop works (ROADMAP Phase 4), but keep asset paths SW-cache friendly.

## Consequences

- Conventional, well-documented toolchain → low onboarding cost, works with smaller models per our practices.
- pnpm + Vite + Vitest + Playwright is a coherent, fast set with minimal config friction.
- Exact versions/config are pinned when `app/` is scaffolded (Phase 1).
