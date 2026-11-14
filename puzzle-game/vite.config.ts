import { defineConfig } from 'vitest/config';

// Relative base so the same build works from a web root, a sub-path and inside the native shells.
export default defineConfig({
  base: './',
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 800 },
  test: { include: ['tests/**/*.test.ts'] },
});
