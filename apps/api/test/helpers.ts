import type { Express } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { Dependencies } from '../src/container.js';
import { fakePasswordHasher } from './fakes/fake-password-hasher.js';
import { InMemoryLoginAttemptRepository } from './fakes/in-memory-login-attempt.repository.js';
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
      loginAttempts: new InMemoryLoginAttemptRepository(),
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

/** Token CSRF fijo para pruebas: en el doble envío basta con que cookie y cabecera coincidan. */
export const TEST_CSRF_TOKEN = 'token-csrf-de-pruebas-0123456789abcdefghijk';

/** POST con token CSRF (cookie + cabecera), más las cookies extra que se pasen. */
export function post(app: Express, url: string, cookies: string[] = []) {
  return withCsrf(request(app).post(url), cookies);
}

/** Añade el token CSRF a cualquier petición (PATCH, DELETE…). */
export function withCsrf(test: request.Test, cookies: string[] = []) {
  return test
    .set('Cookie', [`simplify_csrf=${TEST_CSRF_TOKEN}`, ...cookies])
    .set('X-CSRF-Token', TEST_CSRF_TOKEN);
}

/**
 * Agente que guarda cookies entre peticiones, como un navegador.
 * Pide el token CSRF igual que lo hará el frontend y lo envía en cada petición.
 */
export async function csrfAgent(app: Express) {
  const agent = request.agent(app);
  const res = await agent.get('/api/v1/auth/csrf').expect(200);
  return agent.set('X-CSRF-Token', res.body.csrfToken as string);
}
