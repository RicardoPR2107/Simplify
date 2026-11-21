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
  const add = async (type: string, category: string, amount: string, date: string) =>
    agent
      .post('/api/v1/movements')
      .send({ type, categoryId: await categoryId(category), amount, date, description: 'Mov' })
      .expect(201);
  return { agent, add };
}

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Resúmenes con base de datos real', () => {
  it('el balance del mes es exacto y respeta los límites del mes', async () => {
    const { agent, add } = await registeredAgent();
    await add('INCOME', 'Salario', '2500.10', '2026-11-01');
    await add('EXPENSE', 'Alimentación', '0.10', '2026-11-30');
    await add('EXPENSE', 'Alimentación', '0.20', '2026-11-30');
    await add('EXPENSE', 'Vivienda', '700', '2026-10-31');
    await add('EXPENSE', 'Vivienda', '700', '2026-12-01');

    const res = await agent.get('/api/v1/summary/month?year=2026&month=11').expect(200);
    expect(res.body).toMatchObject({ income: '2500.10', expense: '0.30', balance: '2499.80' });
  });

  it('un balance negativo se devuelve con signo', async () => {
    const { agent, add } = await registeredAgent();
    await add('INCOME', 'Freelance', '100', '2026-11-05');
    await add('EXPENSE', 'Salud', '250.50', '2026-11-06');

    const res = await agent.get('/api/v1/summary/month?year=2026&month=11').expect(200);
    expect(res.body.balance).toBe('-150.50');
  });

  it('agrupa por categoría con el nombre actual y el porcentaje', async () => {
    const { agent, add } = await registeredAgent();
    await add('EXPENSE', 'Vivienda', '600', '2026-11-01');
    await add('EXPENSE', 'Transporte', '150', '2026-11-08');
    await add('EXPENSE', 'Transporte', '150', '2026-11-20');
    await add('EXPENSE', 'Alimentación', '100', '2026-11-21');

    const res = await agent.get('/api/v1/summary/categories?year=2026&month=11').expect(200);
    expect(res.body.total).toBe('1000.00');
    expect(
      res.body.items.map((i: { name: string; percentage: number }) => [i.name, i.percentage]),
    ).toEqual([
      ['Vivienda', 60],
      ['Transporte', 30],
      ['Alimentación', 10],
    ]);
  });

  it('la evolución cruza el cambio de año e incluye meses vacíos', async () => {
    const { agent, add } = await registeredAgent();
    await add('INCOME', 'Salario', '1000', '2025-11-15');
    await add('EXPENSE', 'Vivienda', '300', '2026-01-10');
    await add('INCOME', 'Salario', '1200', '2026-03-31');
    await add('INCOME', 'Salario', '9999', '2025-09-30'); // fuera de la ventana de 6 meses

    const res = await agent.get('/api/v1/summary/evolution?year=2026&month=3').expect(200);
    expect(
      res.body.months.map((m: { year: number; month: number; balance: string }) => [
        `${m.year}-${m.month}`,
        m.balance,
      ]),
    ).toEqual([
      ['2025-10', '0.00'],
      ['2025-11', '1000.00'],
      ['2025-12', '0.00'],
      ['2026-1', '-300.00'],
      ['2026-2', '0.00'],
      ['2026-3', '1200.00'],
    ]);
  });

  it('RN-05: los resúmenes solo incluyen los movimientos del usuario', async () => {
    const victim = await registeredAgent('victima@example.com');
    const other = await registeredAgent('otro@example.com');
    await victim.add('INCOME', 'Salario', '5000', '2026-11-01');

    const month = await other.agent.get('/api/v1/summary/month?year=2026&month=11').expect(200);
    expect(month.body.income).toBe('0.00');
    const byCategory = await other.agent
      .get('/api/v1/summary/categories?year=2026&month=11&type=INCOME')
      .expect(200);
    expect(byCategory.body.items).toEqual([]);
  });
});
