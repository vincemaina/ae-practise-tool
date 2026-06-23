# Research: what makes it feel premium (LeetCode / Brilliant / Codecademy)

_Research date: 2026-06-22. Reference tools: LeetCode (dev practice), Brilliant (interactive STEM), Codecademy (guided coding)._

## What the references do well

**LeetCode**
- Signature layout: **split view — problem on the left, editor on the right**, resizable.
- **Difficulty badges** (Easy/Medium/Hard) with semantic colours; problem-list status (solved/attempted) at a glance.
- Key lesson from user complaints: **keep Run/Submit close to the editor** — the redesign that floated them to the top bar was widely disliked ("constantly moving the mouse"). Actions belong next to the code.

**Brilliant**
- Core loop = **solve → immediate feedback + hints → points/progress**. Feedback is instant and emotional.
- Worked with a design agency specifically to add **game-feel via animation/transition** — but usability-first, tested to keep only animations that helped.
- Progression/points create a sense of momentum and reduce attrition.

**Codecademy**
- **Split-screen**: information on one side, action on the other; **instant auto-graded feedback**.
- **Visible progress** (bars/percentages) and **sensible feedback for every action** (taps, runs, loads).

## 2026 "premium" design principles (synthesis)

- **Semantic design tokens** that work across light & dark *without per-component overrides* — one source of truth for colour/space/radius/shadow.
- **Dark-first, elevation via subtle greys** (not pure-black inversion); contrast tuned for dark.
- **Microinteractions as a premium signal** — soft hover/active/focus states, smooth transitions; NN/g notes large gains in *perceived* responsiveness. Use **soft highlights**, not harsh brightness jumps.
- **Restraint**: calm interfaces, no theatrics. Delight in small, purposeful moments — and **respect `prefers-reduced-motion`**.

## Decisions for this tool (this is reversible styling, not an ADR)

1. **Token-based theme** in CSS variables; **light + dark** with a persisted toggle that defaults to `prefers-color-scheme`.
2. **App shell**: sticky top bar (brand · progress bar · theme toggle) → sidebar (filters + question list with difficulty badges, solved checks, per-difficulty progress) → **split workspace: problem panel | editor + results**. Run/Submit stay directly under the editor.
3. **Difficulty badges** with semantic colours (easy=green, medium=amber, hard=rose).
4. **Immediate feedback**: prominent correct/incorrect banner; a small, quick **confetti** burst on correct (disabled under reduced-motion); existing progressive hints, styled.
5. **Engine loading state**: a proper "starting the in-browser SQL engine" indicator (the ~8 MB wasm first-load is real — make the wait feel intentional).
6. **CodeMirror theme synced** to app theme (One Dark in dark mode).
7. **Polished results table**: sticky header, zebra rows, monospaced values, row count, NULL styling.

## Sources
- [LeetCode — split view vs dynamic layout (discuss)](https://leetcode.com/discuss/interview-question/4770646/Leetcode-UI:-Dynamic-Layout-vs-Split-View-mode/) · [redesign critique](https://leetcode.com/discuss/post/4303480/The-New-Leetcode-UIUX-Update-is-NOT-Good-oror-Full-Explanation-and-Breakdown/)
- [How Brilliant uses gamification (Trophy)](https://trophy.so/blog/brilliant-gamification-case-study) · [Brilliant × ustwo](https://ustwo.com/work/brilliant/)
- [Dark mode design systems: tokens & hierarchy (Muzli)](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/)
- [Dark mode best practices 2026](https://natebal.com/best-practices-for-dark-mode/)
- [Codecademy — UI/UX layout & feedback docs](https://www.codecademy.com/resources/docs/uiux/layout)
