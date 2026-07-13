---
title: Solution explanations on reveal (schema field + author all ~74)
type: feature
area: content
priority: P1
effort: M
status: open
---

## Problem

Reveal shows the canonical SQL bare — no *why*. The question schema (`app/src/content/schema.ts`, generated `question.schema.json`) has `hints` and `canonical` but no explanation field. For interview prep the approach ("QUALIFY beats a subquery here because…", "this is an anti-join pattern") is the product; market research (`notes/research/feature-ideas-2026.md`) calls explanations the most consistently praised feature in competing tools (e.g. DataLemur).

## Fix sketch

1. Add optional `explanation` (markdown string or line-array, same convention as `sql`) and optional `alternatives` (array of `{ sql, note }`) to the question schema + Zod + `pnpm schema:generate`.
2. Render on reveal in the output drawer (markdown-lite rendering is fine — paragraphs + inline code; avoid a heavy markdown dep if a small renderer suffices, but keep it XSS-safe).
3. Author explanations for all questions (`app/src/content/questions/*.json`). Batchable: group by pack; 2–4 sentences each — why this approach, the key concept, the common wrong path. This is the bulk of the effort and can be split across several sessions/agents by pack.
4. Optionally have `verify:content` warn (not fail) on questions missing an explanation, so new content trends toward 100%.

## Acceptance criteria

- Schema + loader + UI support `explanation`/`alternatives`; jsdom test asserts it renders on reveal.
- Every existing question has an `explanation` (or the coverage warning lists the stragglers deliberately left).
- `pnpm verify:content` green.
