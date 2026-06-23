import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// DuckDB-Wasm ships its own workers + .wasm; excluding it from dep pre-bundling
// avoids esbuild choking on the worker assets (see ADR 0005).
export default defineConfig({
  plugins: [react()],
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
