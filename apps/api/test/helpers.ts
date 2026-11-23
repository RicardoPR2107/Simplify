import { pino } from 'pino';
import { createApp } from '../src/app.js';
import type { Dependencies } from '../src/container.js';

/** Crea la app con dependencias simuladas (dobles de prueba) y sin logs. */
export function buildTestApp(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    database: { ping: async () => true },
    ...overrides,
  };
  return createApp({
    env: { NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
    logger: pino({ level: 'silent' }),
    deps,
  });
}
