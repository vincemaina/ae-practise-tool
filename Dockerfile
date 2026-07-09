# Dev container for the agent. The important bit is in docker-compose.yml: a
# named volume mounted at app/node_modules gives the CONTAINER its own deps, so
# host (macOS) and container (linux) native binaries — esbuild, rolldown,
# better-sqlite3, etc. — never overwrite each other across the shared mount.
FROM node:20-bookworm

# python3: the dev-feedback reader (sqlite3) + node-gyp; build-essential: native modules.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# pnpm pinned to the project's packageManager version, via corepack.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# --- Optional: a headless browser so the agent can screenshot / e2e the UI. ---
# Uncomment to enable `pnpm screenshot` and `pnpm e2e` inside the container.
# ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# RUN npx -y playwright@1.61.0 install --with-deps chromium && chmod -R 777 /ms-playwright

WORKDIR /workspace/app
CMD ["sleep", "infinity"]
