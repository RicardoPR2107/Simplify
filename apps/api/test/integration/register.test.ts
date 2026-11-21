import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { argon2Hasher } from '../../src/lib/password.js';
import { post } from '../helpers.js';
import { buildIntegrationApp } from './app.js';
import { createTestPrisma, resetData } from './database.js';

const prisma = createTestPrisma();
const app = buildIntegrationApp(prisma);
const body = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Registro con base de datos real', () => {
  it('guarda el usuario con la contraseña cifrada con Argon2id', async () => {
    const res = await post(app, '/api/v1/auth/register').send(body);
    expect(res.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ricardo@example.com' } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2Hasher.verify(user.passwordHash, 'Clave#Segura123')).toBe(true);
  });

  it('crea las 11 categorías predeterminadas (4 de ingreso y 7 de gasto)', async () => {
    const res = await post(app, '/api/v1/auth/register').send(body);

    const categories = await prisma.category.findMany({ where: { userId: res.body.user.id } });
    expect(categories).toHaveLength(11);
    expect(categories.filter((c) => c.type === 'INCOME')).toHaveLength(4);
    expect(categories.filter((c) => c.type === 'EXPENSE')).toHaveLength(7);
    expect(categories.every((c) => c.isDefault)).toBe(true);
  });

  it('dos registros simultáneos con el mismo correo crean una sola cuenta', async () => {
    const [a, b] = await Promise.all([
      post(app, '/api/v1/auth/register').send(body),
      post(app, '/api/v1/auth/register').send(body),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.category.count()).toBe(11);
  });
});
