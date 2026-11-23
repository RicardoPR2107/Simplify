import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp, csrfAgent } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };
type Agent = Awaited<ReturnType<typeof csrfAgent>>;

async function setup() {
  const agent = await csrfAgent(buildTestApp());
  await agent.post('/api/v1/auth/register').send(account).expect(201);
  const food = await category(agent, 'Comida', 'EXPENSE');
  const salary = await category(agent, 'Sueldo', 'INCOME');
  return { agent, food, salary };
}

async function category(agent: Agent, name: string, type: 'INCOME' | 'EXPENSE') {
  const res = await agent.post('/api/v1/categories').send({ name, type }).expect(201);
  return res.body.category.id as string;
}

function expense(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    type: 'EXPENSE',
    description: 'Supermercado',
    amount: '85.5',
    categoryId,
    date: '2026-11-15',
    ...overrides,
  };
}

describe('POST /api/v1/movements (RF-05, RF-06)', () => {
  it('registra un gasto y devuelve el importe con 2 decimales', async () => {
    const { agent, food } = await setup();
    const res = await agent.post('/api/v1/movements').send(expense(food, { notes: 'Semana' }));

    expect(res.status).toBe(201);
    expect(res.body.movement).toMatchObject({
      type: 'EXPENSE',
      description: 'Supermercado',
      amount: '85.50',
      date: '2026-11-15',
      notes: 'Semana',
      category: { id: food, name: 'Comida', type: 'EXPENSE' },
    });
  });

  it('RN-03: rechaza una categoría de otro tipo', async () => {
    const { agent, salary } = await setup();
    const res = await agent.post('/api/v1/movements').send(expense(salary));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CATEGORY_TYPE_MISMATCH');
  });

  it('rechaza una categoría que no existe', async () => {
    const { agent } = await setup();
    const res = await agent
      .post('/api/v1/movements')
      .send(expense('00000000-0000-4000-8000-000000000000'));

    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeDefined();
  });

  it.each([
    ['cero', '0'],
    ['negativo', '-10'],
    ['con 3 decimales', '10.999'],
    ['como número en vez de texto', 10.5],
    ['con letras', '10abc'],
  ])('RN-01: rechaza un importe %s', async (_case, amount) => {
    const { agent, food } = await setup();
    const res = await agent.post('/api/v1/movements').send(expense(food, { amount }));

    expect(res.status).toBe(400);
    expect(res.body.error.fields.amount).toBeDefined();
  });

  it.each([['2026-02-30'], ['15/11/2026'], ['2026-13-01']])(
    'RN-08: rechaza la fecha %s',
    async (date) => {
      const { agent, food } = await setup();
      const res = await agent.post('/api/v1/movements').send(expense(food, { date }));
      expect(res.status).toBe(400);
      expect(res.body.error.fields.date).toBeDefined();
    },
  );

  it('guarda unas notas vacías como null', async () => {
    const { agent, food } = await setup();
    const res = await agent.post('/api/v1/movements').send(expense(food, { notes: '   ' }));
    expect(res.body.movement.notes).toBeNull();
  });

  it('sin sesión responde 401', async () => {
    const res = await request(buildTestApp()).get('/api/v1/movements');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/movements (historial)', () => {
  async function withHistory() {
    const ctx = await setup();
    const rows = [
      expense(ctx.food, { description: 'Supermercado', amount: '120.00', date: '2026-11-01' }),
      expense(ctx.food, { description: 'Café', amount: '8.50', date: '2026-11-10' }),
      expense(ctx.food, { description: 'Super del barrio', amount: '45.00', date: '2026-10-20' }),
      {
        type: 'INCOME',
        description: 'Sueldo noviembre',
        amount: '3000',
        categoryId: ctx.salary,
        date: '2026-11-05',
      },
    ];
    for (const row of rows) await ctx.agent.post('/api/v1/movements').send(row).expect(201);
    return ctx;
  }

  it('por defecto ordena por fecha descendente con metadatos de paginación', async () => {
    const { agent } = await withHistory();
    const res = await agent.get('/api/v1/movements').expect(200);

    expect(res.body).toMatchObject({ page: 1, pageSize: 10, total: 4, totalPages: 1 });
    expect(res.body.items.map((m: { date: string }) => m.date)).toEqual([
      '2026-11-10',
      '2026-11-05',
      '2026-11-01',
      '2026-10-20',
    ]);
  });

  it('pagina los resultados', async () => {
    const { agent } = await withHistory();
    const res = await agent.get('/api/v1/movements?page=2&pageSize=3').expect(200);

    expect(res.body).toMatchObject({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
    expect(res.body.items).toHaveLength(1);
  });

  it('filtra por tipo, categoría, periodo y texto', async () => {
    const { agent, food } = await withHistory();

    const incomes = await agent.get('/api/v1/movements?type=INCOME').expect(200);
    expect(incomes.body.total).toBe(1);

    const november = await agent
      .get(`/api/v1/movements?categoryId=${food}&from=2026-11-01&to=2026-11-30`)
      .expect(200);
    expect(november.body.total).toBe(2);

    const search = await agent.get('/api/v1/movements?q=SUPER').expect(200);
    expect(search.body.items.map((m: { description: string }) => m.description).sort()).toEqual([
      'Super del barrio',
      'Supermercado',
    ]);
  });

  it('ordena por importe ascendente', async () => {
    const { agent } = await withHistory();
    const res = await agent.get('/api/v1/movements?sortBy=amount&order=asc').expect(200);
    expect(res.body.items.map((m: { amount: string }) => m.amount)).toEqual([
      '8.50',
      '45.00',
      '120.00',
      '3000.00',
    ]);
  });

  it('rechaza parámetros inválidos', async () => {
    const { agent } = await setup();
    await agent.get('/api/v1/movements?pageSize=500').expect(400);
    await agent.get('/api/v1/movements?from=2026-12-01&to=2026-11-01').expect(400);
    await agent.get('/api/v1/movements?sortBy=description').expect(400);
  });
});

describe('GET, PATCH y DELETE /api/v1/movements/:id', () => {
  async function withMovement() {
    const ctx = await setup();
    const res = await ctx.agent.post('/api/v1/movements').send(expense(ctx.food)).expect(201);
    return { ...ctx, id: res.body.movement.id as string };
  }

  it('consulta un movimiento', async () => {
    const { agent, id } = await withMovement();
    const res = await agent.get(`/api/v1/movements/${id}`).expect(200);
    expect(res.body.movement.id).toBe(id);
  });

  it('RF-08: edita solo los campos enviados', async () => {
    const { agent, id } = await withMovement();
    const res = await agent.patch(`/api/v1/movements/${id}`).send({ amount: '90' }).expect(200);
    expect(res.body.movement).toMatchObject({ amount: '90.00', description: 'Supermercado' });
  });

  it('rechaza cambiar solo el tipo si la categoría actual no corresponde', async () => {
    const { agent, id } = await withMovement();
    const res = await agent.patch(`/api/v1/movements/${id}`).send({ type: 'INCOME' });
    expect(res.status).toBe(422);
  });

  it('permite cambiar el tipo junto con una categoría compatible', async () => {
    const { agent, id, salary } = await withMovement();
    const res = await agent
      .patch(`/api/v1/movements/${id}`)
      .send({ type: 'INCOME', categoryId: salary })
      .expect(200);
    expect(res.body.movement.category.id).toBe(salary);
  });

  it('RF-09: elimina y luego responde 404', async () => {
    const { agent, id } = await withMovement();
    await agent.delete(`/api/v1/movements/${id}`).expect(204);
    await agent.get(`/api/v1/movements/${id}`).expect(404);
    await agent.delete(`/api/v1/movements/${id}`).expect(404);
  });

  it('rechaza un id con formato inválido', async () => {
    const { agent } = await setup();
    await agent.get('/api/v1/movements/123').expect(400);
  });
});
