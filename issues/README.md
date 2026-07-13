# issues/

The repo's issue tracker: one markdown file per issue, versioned with the code so any session (human or agent, any machine) can pick up work without external auth or context. Source: code/product review 2026-07-13; new issues welcome in the same format.

## Format

Filename: `NNNN-<type>-<slug>.md` (number = creation order, never reused). Frontmatter:

```yaml
---
title: One-line summary
type: bug | refactor | feature | tests | chore
area: engine | grading | dbt | editor | ui | content | a11y | app
priority: P1 | P2 | P3   # P1 = user-facing correctness, fix first
effort: S | M | L
status: open | in-progress | done
---
```

Body sections: **Problem** (with `file:line` refs), **Failure scenario** (bugs), **Fix sketch**, **Acceptance criteria**. The frontmatter `status` is authoritative — there is no separate index to keep in sync.

## Workflow (for an agent picking up work)

1. `grep -l 'status: open' issues/*.md` and pick by priority (P1 first). Read the whole issue.
2. Set `status: in-progress` while working; `status: done` when finished, appending a `## Resolution` section (what changed, files touched).
3. Definition of done per issue's acceptance criteria, plus the repo baseline: `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:content && pnpm build` from `app/` (and `pnpm exec playwright test --project=chromium` for UI changes). Every bug fix lands with a regression test.
4. **Do not commit** — repo rule (see root `CLAUDE.md`): the user reviews and commits all changes themselves.
