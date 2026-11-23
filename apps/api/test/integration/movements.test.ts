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
  const categoryId = async (name: string) =>
    (await prisma.category.findFirstOrThrow({ where: { userId: user.id, name } })).id;
  return { agent, userId: user.id, categoryId };
}

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Movimientos con base de datos real', () => {
  it('guarda los importes sin errores de redondeo (0.10 + 0.20 = 0.30)', async () => {
    const { agent, categoryId } = await registeredAgent();
    const food = await categoryId('Alimentación');
    for (const amount of ['0.10', '0.20']) {
      await agent
        .post('/api/v1/movements')
        .send({
          type: 'EXPENSE',
          description: 'Caramelo',
          amount,
          categoryId: food,
          date: '2026-11-15',
        })
        .expect(201);
    }

    const [{ sum }] = await prisma.$queryRaw<[{ sum: string }]>`
      SELECT SUM(amount)::text AS sum FROM movements`;
    expect(sum).toBe('0.30');
  });

  it('acepta el importe máximo y lo devuelve exacto', async () => {
    const { agent, categoryId } = await registeredAgent();
    const res = await agent
      .post('/api/v1/movements')
      .send({
        type: 'INCOME',
        description: 'Premio',
        amount: '9999999999.99',
        categoryId: await categoryId('Inversiones'),
        date: '2026-11-15',
      })
      .expect(201);
    expect(res.body.movement.amount).toBe('9999999999.99');
  });

  it('el periodo incluye el primer y el último día, sin desfases de zona horaria', async () => {
    const { agent, categoryId } = await registeredAgent();
    const food = await categoryId('Alimentación');
    for (const date of ['2026-10-31', '2026-11-01', '2026-11-30', '2026-12-01']) {
      await agent
        .post('/api/v1/movements')
        .send({
          type: 'EXPENSE',
          description: `Gasto ${date}`,
          amount: '1',
          categoryId: food,
          date,
        })
        .expect(201);
    }

    const res = await agent.get('/api/v1/movements?from=2026-11-01&to=2026-11-30').expect(200);
    expect(res.body.items.map((m: { date: string }) => m.date)).toEqual([
      '2026-11-30',
      '2026-11-01',
    ]);
  });

  it('busca sin distinguir mayúsculas y ordena por importe', async () => {
    const { agent, categoryId } = await registeredAgent();
    const food = await categoryId('Alimentación');
    for (const [description, amount] of [
      ['Supermercado', '120.00'],
      ['SUPER del barrio', '45.00'],
      ['Café', '8.50'],
    ] as const) {
      await agent
        .post('/api/v1/movements')
        .send({ type: 'EXPENSE', description, amount, categoryId: food, date: '2026-11-10' })
        .expect(201);
    }

    const res = await agent.get('/api/v1/movements?q=super&sortBy=amount&order=desc').expect(200);
    expect(res.body.items.map((m: { amount: string }) => m.amount)).toEqual(['120.00', '45.00']);
  });

  it('pagina de forma estable aunque varios movimientos compartan fecha', async () => {
    const { agent, categoryId } = await registeredAgent();
    const food = await categoryId('Alimentación');
    for (let i = 1; i <= 7; i++) {
      await agent
        .post('/api/v1/movements')
        .send({
          type: 'EXPENSE',
          description: `Gasto ${i}`,
          amount: '1',
          categoryId: food,
          date: '2026-11-10',
        })
        .expect(201);
    }

    const pages = await Promise.all(
      [1, 2, 3].map((page) => agent.get(`/api/v1/movements?pageSize=3&page=${page}`)),
    );
    const ids = pages.flatMap((p) => p.body.items.map((m: { id: string }) => m.id));
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('RN-05: un usuario no puede ver, editar ni borrar movimientos de otro', async () => {
    const victim = await registeredAgent('victima@example.com');
    const attacker = await registeredAgent('atacante@example.com');
    const created = await victim.agent
      .post('/api/v1/movements')
      .send({
        type: 'EXPENSE',
        description: 'Alquiler',
        amount: '800',
        categoryId: await victim.categoryId('Vivienda'),
        date: '2026-11-01',
      })
      .expect(201);
    const id = created.body.movement.id as string;

    await attacker.agent.get(`/api/v1/movements/${id}`).expect(404);
    await attacker.agent.patch(`/api/v1/movements/${id}`).send({ amount: '1' }).expect(404);
    await attacker.agent.delete(`/api/v1/movements/${id}`).expect(404);
    const list = await attacker.agent.get('/api/v1/movements').expect(200);
    expect(list.body.total).toBe(0);

    const stored = await prisma.movement.findUniqueOrThrow({ where: { id } });
    expect(stored.amount.toFixed(2)).toBe('800.00');
  });

  it('RN-05: no permite registrar un movimiento con la categoría de otro usuario', async () => {
    const victim = await registeredAgent('victima@example.com');
    const attacker = await registeredAgent('atacante@example.com');

    await attacker.agent
      .post('/api/v1/movements')
      .send({
        type: 'EXPENSE',
        description: 'Intento',
        amount: '1',
        categoryId: await victim.categoryId('Vivienda'),
        date: '2026-11-01',
      })
      .expect(400);
    expect(await prisma.movement.count()).toBe(0);
  });

  it('la categoría deja de poder eliminarse sin destino en cuanto tiene un movimiento', async () => {
    const { agent, categoryId } = await registeredAgent();
    const health = await categoryId('Salud');
    await agent
      .post('/api/v1/movements')
      .send({
        type: 'EXPENSE',
        description: 'Farmacia',
        amount: '25',
        categoryId: health,
        date: '2026-11-03',
      })
      .expect(201);

    await agent.delete(`/api/v1/categories/${health}`).expect(409);
    const categories = await agent.get('/api/v1/categories?type=EXPENSE').expect(200);
    expect(
      categories.body.categories.find((c: { id: string }) => c.id === health).movementCount,
    ).toBe(1);
  });
});
