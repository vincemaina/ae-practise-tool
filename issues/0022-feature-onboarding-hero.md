---
title: First-visit onboarding — frame the product and the three pillars
type: feature
area: ui
priority: P2
effort: S
status: open
---

## Problem

A first-time visitor to https://ae-practise-tool.vchapandrews.workers.dev lands on a ~70-row table with zero framing: no "what is this / who is it for / everything runs in your browser", and the three pillars are three unlabeled top-bar tabs — nothing explains that **Model** is a working dbt IDE (the product's most differentiating feature).

## Fix sketch

- A dismissible hero/banner on the problem list, shown until dismissed (localStorage flag): one line of positioning — e.g. "Practice warehouse SQL, learn dbt, and build models in a mini dbt IDE. No signup — everything runs in your browser, offline-capable." — plus a "Start here →" pointing at the first Foundations-track question and a nod to the Model tab.
- Keep it lightweight: no multi-step tour, no modal-on-load. Copy should follow the UI-terminology rule (no "modes").

## Acceptance criteria

- Shows on first visit, dismiss persists, never blocks returning users.
- jsdom test for show/dismiss/persist; `pnpm screenshot` reviewed in light + dark.
