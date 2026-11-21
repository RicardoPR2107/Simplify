import type request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { argon2Hasher } from '../../src/lib/password.js';
import { PrismaUserRepository } from '../../src/modules/auth/auth.repository.js';
import { PrismaLoginAttemptRepository } from '../../src/modules/auth/login-attempt.repository.js';
import { PrismaRefreshTokenRepository } from '../../src/modules/auth/refresh-token.repository.js';
import { buildTestApp, csrfAgent, post } from '../helpers.js';
import { createTestPrisma, resetData } from './database.js';

const prisma = createTestPrisma();
const app = buildTestApp({
  repositories: {
    users: new PrismaUserRepository(prisma),
    refreshTokens: new PrismaRefreshTokenRepository(prisma),
    loginAttempts: new PrismaLoginAttemptRepository(prisma),
  },
  passwordHasher: argon2Hasher,
});
const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

function refreshCookie(res: request.Response): string {
  const lines = res.headers['set-cookie'] as unknown as string[];
  return lines.find((line) => line.startsWith('simplify_rt='))!.split(';')[0]!;
}

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Sesiones con base de datos real', () => {
  it('login, perfil y cierre de sesión de punta a punta', async () => {
    await post(app, '/api/v1/auth/register').send(account).expect(201);

    const agent = await csrfAgent(app);
    await agent
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);
    const me = await agent.get('/api/v1/me').expect(200);
    expect(me.body.user.email).toBe(account.email);

    await agent.post('/api/v1/auth/logout').expect(204);
    await agent.get('/api/v1/me').expect(401);
  });

  it('guarda el token de renovación solo como hash', async () => {
    const res = await post(app, '/api/v1/auth/register').send(account);
    const raw = refreshCookie(res).split('=')[1]!;

    const stored = await prisma.refreshToken.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.tokenHash).not.toBe(raw);
    expect(stored[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('dos renovaciones simultáneas con el mismo token se tratan como robo', async () => {
    const res = await post(app, '/api/v1/auth/register').send(account);
    const cookie = refreshCookie(res);

    const [a, b] = await Promise.all([
      post(app, '/api/v1/auth/refresh', [cookie]),
      post(app, '/api/v1/auth/refresh', [cookie]),
    ]);

    // Solo una puede ganar: la otra se detecta como reutilización y se rechaza.
    expect([a.status, b.status]).toContain(401);
    expect([a.status, b.status]).not.toEqual([204, 204]);
  });
});

describe('Límite de intentos con base de datos real', () => {
  it('registra los fallos como hash y bloquea al sexto intento', async () => {
    await post(app, '/api/v1/auth/register').send(account).expect(201);
    for (let i = 0; i < 5; i++) {
      await post(app, '/api/v1/auth/login')
        .send({ email: account.email, password: 'Incorrecta#1' })
        .expect(401);
    }

    await post(app, '/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(429);

    const rows = await prisma.loginAttempt.findMany();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => !row.key.includes('ricardo'))).toBe(true);
  });
});

describe('Perfil con base de datos real', () => {
  it('guarda el cambio de nombre y moneda', async () => {
    const agent = await csrfAgent(app);
    await agent.post('/api/v1/auth/register').send(account).expect(201);
    await agent.patch('/api/v1/me').send({ name: 'Ricardo Palma', currency: 'PEN' }).expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    expect(user).toMatchObject({ name: 'Ricardo Palma', currency: 'PEN' });
  });
});
