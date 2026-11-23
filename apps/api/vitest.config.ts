import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Las de integración necesitan PostgreSQL: se ejecutan con vitest.integration.config.ts.
    exclude: ['test/integration/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/server.ts', 'src/**/*.d.ts'],
    },
  },
});
