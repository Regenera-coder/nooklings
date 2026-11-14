import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@nooklings/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@nooklings/content': fileURLToPath(new URL('./packages/content/src/index.ts', import.meta.url)),
    },
  },
  test: { include: ['packages/*/test/**/*.test.ts'] },
});
