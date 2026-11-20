import { defineConfig } from 'vitest/config';

/** Pruebas de integración: usan un PostgreSQL real (ver test/integration/database.ts). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    globalSetup: ['test/integration/global-setup.ts'],
    // Comparten una sola base de datos: los archivos se ejecutan uno tras otro.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
