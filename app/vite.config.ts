import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// DuckDB-Wasm ships its own workers + .wasm; excluding it from dep pre-bundling
// avoids esbuild choking on the worker assets (see ADR 0005).
export default defineConfig({
  plugins: [
    react(),
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
        // App shell (worker chunks are < 2 MB and matched here). The large DuckDB
        // .wasm files are intentionally NOT precached — see runtimeCaching below.
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'duckdb-wasm',
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
    exclude: ['@duckdb/duckdb-wasm'],
  },
  test: {
    // Default to node (pure logic tests); component tests opt into jsdom via
    // a `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
