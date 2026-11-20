import { pino } from 'pino';
import { createApp } from '../src/app.js';
import type { Dependencies } from '../src/container.js';
import { fakePasswordHasher } from './fakes/fake-password-hasher.js';
import { InMemoryRefreshTokenRepository } from './fakes/in-memory-refresh-token.repository.js';
import { InMemoryUserRepository } from './fakes/in-memory-user.repository.js';

export const TEST_JWT_SECRET = 'clave-de-pruebas-de-al-menos-32-caracteres!!';

/** Crea la app con dependencias simuladas (dobles de prueba) y sin logs. */
export function buildTestApp(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    database: { ping: async () => true },
    repositories: {
      users: new InMemoryUserRepository(),
      refreshTokens: new InMemoryRefreshTokenRepository(),
    },
    passwordHasher: fakePasswordHasher,
    ...overrides,
  };
  return createApp({
    env: { NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173', JWT_SECRET: TEST_JWT_SECRET },
    logger: pino({ level: 'silent' }),
    deps,
  });
}
