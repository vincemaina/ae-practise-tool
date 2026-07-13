---
title: Miscellaneous small fixes from the 2026-07-13 review
type: chore
area: app
priority: P3
effort: S
status: open
---

Grab-bag of one-liners and small items; fix opportunistically or in one sweep.

**Behaviour**
- `app/src/App.tsx:208` — in a session, Prev on question 1 is an enabled button that silently does nothing; pass `disabled` to TopBar instead.
- `app/src/components/SessionSetup.tsx:52` — deselecting *all* difficulty chips silently means "all difficulties"; keep ≥1 chip on or show "0 match".
- `app/src/components/PracticeView.tsx:121-125` — timer starts while the engine is still loading and keeps ticking in hidden tabs; gate on `ready` + `visibilitychange`.
- `app/src/components/DbtWorkspace.tsx:335` — `submit()` rebuilds the reference solution every submit; cache per challenge mount.
- `app/src/dbt/engine.ts:44` — `{% if is_incremental() %}…{% else %}…{% endif %}` fails as "malformed Jinja"; support or error clearly (may be absorbed by issue 0004).
- `app/src/dbt/engine.ts:208` — append-strategy incremental uses `INSERT INTO t <select>` with no column list; a column-order difference silently misaligns data.
- `app/src/dbt/grade.ts:31` — `mustUse` is a raw substring test: satisfied by a comment, defeated by `ref ('x')` (space). Strip comments and/or loosen whitespace.
- `app/src/content/schema.ts:130` — `new RegExp(p.requires.pattern)` runs outside the Zod parse, so an invalid regex in question JSON throws without the `friendly()` file-tagged message.
- `app/src/session/session.ts:19-20` — `includeSolved` silently ignored for pools `all`/`review`; narrow the config type or document.

**Perf (only if the bank grows)**
- `app/src/grading/grade.ts:117-127,169-176` — multiset match is O(rows²); hash normalized rows for O(n) if datasets exceed ~1k rows.
- `app/src/storage/progress.ts:56-79` — every accessor re-reads/parses the whole store; memo if question count grows.

**Style**
- `app/src/components/ProblemList.tsx:280` + `PracticeView.tsx:414` — the only two static inline styles in the tree; move to `styles.css`.
- Three separate CodeMirror config assemblies (`SqlEditor.tsx:70`, `SqlBlock.tsx:14`, `DbtWorkspace.tsx:505`); share a `baseSqlExtensions(dark)`.
- `app/src/editor/activeStatement.ts:53` — Cmd+Tab away on macOS can leave `modHeld` stale until next keydown/blur.

## Acceptance criteria

Each fixed item keeps the full baseline green; strike items here as they land (or note them in `## Resolution`).
