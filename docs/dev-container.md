# Dev container — isolated `node_modules`

## The problem
The repo is bind-mounted into the agent's Linux container, so `app/node_modules`
is **shared with the macOS host**. Native packages install platform-specific
binaries (`esbuild`, `rolldown`/Vite, `better-sqlite3`, …). So:

- agent runs `pnpm install` in the container → Linux binaries overwrite the host's
- host runs `pnpm install` on macOS → darwin binaries overwrite the container's

…and whoever ran second has to reinstall. Symptom: `Cannot find native binding` /
`Cannot find module '@rolldown/binding-linux-…'` / `ERR_PNPM_UNEXPECTED_STORE`.

## The fix
Give the **container its own `node_modules`** with a Docker **named volume**
mounted at `app/node_modules`. It overlays the bind mount at just that path, so:

- host's `app/node_modules` (on the Mac filesystem) stays **darwin** — untouched
- container's `app/node_modules` (the volume) stays **linux** — untouched

Each installs once; neither reinstalls again. Everything else in the repo
(source, `.dev-data`, lockfile) stays shared as before.

## Usage (this repo's compose)
```bash
docker compose up -d --build     # first start compiles native deps into the volume (~1–2 min)
docker compose exec dev bash     # shell in; run pnpm / python3 here
docker compose down              # stop; the volume persists
```
The **host** keeps doing `pnpm install` / `pnpm dev` directly on macOS as normal.

## Applying it to a different launch method
The only thing that matters is mounting a volume over the container's
`app/node_modules`. If you launch with plain `docker run`, add:
```bash
docker run ... \
  -v "$PWD":/workspace \
  -v agent_node_modules:/workspace/app/node_modules \
  ...
```
If your existing setup launches the container some other way, just add that
second `-v` (a named volume at `…/app/node_modules`) and rebuild/recreate.

## Optional: a browser for visual checks
Uncomment the Playwright lines in the `Dockerfile` to bake Chromium + deps into
the image, enabling `pnpm screenshot` / `pnpm e2e` inside the container (so the
agent can see the UI directly). Adds ~1–2 min to the build and ~400 MB.
