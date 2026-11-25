import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Only the domain tests, for mutation testing (Stryker, `npm run test:mutation`).
 * The domain is pure TypeScript: no DOM, no React, so a plain Node run.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/domain/**/*.test.ts'],
    // Mutated code runs slower; the property tests need room.
    testTimeout: 60_000,
    env: { PERF_BUDGET_MS: '5000' },
  },
});
