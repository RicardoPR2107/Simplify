import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp, csrfAgent } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

async function withData() {
  const agent = await csrfAgent(buildTestApp());
  await agent.post('/api/v1/auth/register').send(account).expect(201);
  const create = async (name: string, type: string) =>
    (await agent.post('/api/v1/categories').send({ name, type }).expect(201)).body.category
      .id as string;
  const salary = await create('Sueldo', 'INCOME');
  const food = await create('Comida', 'EXPENSE');
  const home = await create('Vivienda', 'EXPENSE');
  const add = (type: string, categoryId: string, amount: string, date: string) =>
    agent
      .post('/api/v1/movements')
      .send({ type, categoryId, amount, date, description: 'Movimiento' })
      .expect(201);

  await add('INCOME', salary, '3000', '2026-11-01');
  await add('EXPENSE', home, '800', '2026-11-02');
  await add('EXPENSE', food, '150.25', '2026-11-15');
  await add('EXPENSE', food, '49.75', '2026-11-30');
  await add('EXPENSE', food, '999', '2026-10-31'); // otro mes: no cuenta en noviembre
  return agent;
}

describe('GET /api/v1/summary/month', () => {
  it('devuelve ingresos, gastos y balance del mes', async () => {
    const agent = await withData();
    const res = await agent.get('/api/v1/summary/month?year=2026&month=11').expect(200);
    expect(res.body).toEqual({
      year: 2026,
      month: 11,
      income: '3000.00',
      expense: '1000.00',
      balance: '2000.00',
    });
  });

  it('exige año y mes válidos', async () => {
    const agent = await withData();
    await agent.get('/api/v1/summary/month').expect(400);
    await agent.get('/api/v1/summary/month?year=2026&month=13').expect(400);
  });

  it('sin sesión responde 401', async () => {
    await request(buildTestApp()).get('/api/v1/summary/month?year=2026&month=11').expect(401);
  });
});

describe('GET /api/v1/summary/categories', () => {
  it('agrupa los gastos por categoría de mayor a menor con porcentaje', async () => {
    const agent = await withData();
    const res = await agent.get('/api/v1/summary/categories?year=2026&month=11').expect(200);

    expect(res.body.type).toBe('EXPENSE');
    expect(res.body.total).toBe('1000.00');
    expect(res.body.items).toEqual([
      expect.objectContaining({ name: 'Vivienda', total: '800.00', percentage: 80 }),
      expect.objectContaining({ name: 'Comida', total: '200.00', percentage: 20 }),
    ]);
  });

  it('también puede agrupar los ingresos', async () => {
    const agent = await withData();
    const res = await agent
      .get('/api/v1/summary/categories?year=2026&month=11&type=INCOME')
      .expect(200);
    expect(res.body.items).toEqual([expect.objectContaining({ name: 'Sueldo', percentage: 100 })]);
  });
});

describe('GET /api/v1/summary/evolution', () => {
  it('devuelve los 6 meses que terminan en el indicado', async () => {
    const agent = await withData();
    const res = await agent.get('/api/v1/summary/evolution?year=2026&month=11').expect(200);

    expect(res.body.months).toHaveLength(6);
    expect(res.body.months[0]).toMatchObject({ year: 2026, month: 6, balance: '0.00' });
    expect(res.body.months[4]).toMatchObject({ month: 10, expense: '999.00', balance: '-999.00' });
    expect(res.body.months[5]).toMatchObject({ month: 11, balance: '2000.00' });
  });
});
