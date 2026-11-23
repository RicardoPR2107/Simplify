import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { csrfAgent } from '../helpers.js';
import { buildIntegrationApp } from './app.js';
import { createTestPrisma, resetData } from './database.js';

const prisma = createTestPrisma();
const app = buildIntegrationApp(prisma);

async function registeredAgent(email = 'ricardo@example.com') {
  const agent = await csrfAgent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ name: 'Ricardo', email, password: 'Clave#Segura123' })
    .expect(201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { agent, userId: user.id };
}

async function categoryByName(userId: string, name: string) {
  return prisma.category.findFirstOrThrow({ where: { userId, name } });
}

async function addMovements(userId: string, categoryId: string, count: number) {
  await prisma.movement.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      userId,
      categoryId,
      type: 'EXPENSE' as const,
      description: `Gasto ${i + 1}`,
      amount: '10.00',
      date: new Date('2026-11-15'),
    })),
  });
}

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Categorías con base de datos real', () => {
  it('una cuenta nueva ve sus 11 categorías predeterminadas con su uso', async () => {
    const { agent, userId } = await registeredAgent();
    const food = await categoryByName(userId, 'Alimentación');
    await addMovements(userId, food.id, 2);

    const res = await agent.get('/api/v1/categories').expect(200);
    expect(res.body.categories).toHaveLength(11);
    expect(res.body.categories.find((c: { id: string }) => c.id === food.id)).toMatchObject({
      isDefault: true,
      movementCount: 2,
    });
  });

  it('detecta el nombre repetido sin distinguir mayúsculas', async () => {
    const { agent } = await registeredAgent();
    const res = await agent.post('/api/v1/categories').send({ name: 'SALUD', type: 'EXPENSE' });
    expect(res.status).toBe(409);
  });

  it('al eliminar con destino, pasa todos los movimientos en una sola transacción', async () => {
    const { agent, userId } = await registeredAgent();
    const from = await categoryByName(userId, 'Entretenimiento');
    const to = await categoryByName(userId, 'Otros gastos');
    await addMovements(userId, from.id, 3);

    await agent.delete(`/api/v1/categories/${from.id}?reassignTo=${to.id}`).expect(204);

    expect(await prisma.category.findUnique({ where: { id: from.id } })).toBeNull();
    expect(await prisma.movement.count({ where: { categoryId: to.id } })).toBe(3);
  });

  it('sin destino, no borra nada si la categoría tiene movimientos', async () => {
    const { agent, userId } = await registeredAgent();
    const food = await categoryByName(userId, 'Alimentación');
    await addMovements(userId, food.id, 1);

    await agent.delete(`/api/v1/categories/${food.id}`).expect(409);
    expect(await prisma.category.findUnique({ where: { id: food.id } })).not.toBeNull();
  });

  it('RN-05: un usuario no puede ver, renombrar ni borrar categorías de otro', async () => {
    const victim = await registeredAgent('victima@example.com');
    const attacker = await registeredAgent('atacante@example.com');
    const target = await categoryByName(victim.userId, 'Salario');

    await attacker.agent
      .patch(`/api/v1/categories/${target.id}`)
      .send({ name: 'Hackeada' })
      .expect(404);
    await attacker.agent.delete(`/api/v1/categories/${target.id}`).expect(404);

    const own = await attacker.agent.get('/api/v1/categories').expect(200);
    expect(own.body.categories.map((c: { id: string }) => c.id)).not.toContain(target.id);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: target.id } })).name).toBe(
      'Salario',
    );
  });

  it('no permite reasignar los movimientos a una categoría de otro usuario', async () => {
    const victim = await registeredAgent('victima@example.com');
    const attacker = await registeredAgent('atacante@example.com');
    const own = await categoryByName(attacker.userId, 'Salud');
    const foreign = await categoryByName(victim.userId, 'Vivienda');
    await addMovements(attacker.userId, own.id, 1);

    await attacker.agent
      .delete(`/api/v1/categories/${own.id}?reassignTo=${foreign.id}`)
      .expect(400);
    expect(await prisma.movement.count({ where: { categoryId: foreign.id } })).toBe(0);
  });
});
