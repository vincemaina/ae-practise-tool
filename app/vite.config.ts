import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { devFeedback } from './vite/dev-feedback';

// DuckDB-Wasm ships its own workers + .wasm; excluding it from dep pre-bundling
// avoids esbuild choking on the worker assets (see ADR 0005).
export default defineConfig({
  plugins: [
    react(),
    devFeedback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'AE Practice — SQL for analytics engineers',
        short_name: 'AE Practice',
        description:
          'Browser-based SQL practice for analytics engineers — runs entirely on-device.',
        theme_color: '#5b54e6',
        background_color: '#0e1014',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell. Large wasm (DuckDB from the CDN, polyglot self-hosted) is
        // NOT precached — it's runtime-cached below so the install stays light.
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            // DuckDB's wasm + worker are served from jsDelivr (too big to host on
            // Cloudflare). Cache the whole @duckdb CDN path so the engine works
            // offline after first load.
            urlPattern: ({ url }) => url.href.startsWith('https://cdn.jsdelivr.net/npm/@duckdb/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'duckdb-cdn',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Self-hosted wasm (the polyglot Snowflake transpiler).
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-wasm',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: {
    // Both ship their own .wasm loaded via import.meta.url; excluding them from
    // esbuild pre-bundling keeps that resolution intact (ADR 0001/0006).
    exclude: ['@duckdb/duckdb-wasm', '@polyglot-sql/sdk'],
  },
  test: {
    // Default to node (pure logic tests); component tests opt into jsdom via
    // a `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
