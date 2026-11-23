import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { InMemoryCategoryRepository } from './fakes/in-memory-category.repository.js';
import { buildTestApp, csrfAgent, withCsrf } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

async function setup() {
  const categories = new InMemoryCategoryRepository();
  const app = buildTestApp({ repositories: { categories } });
  const agent = await csrfAgent(app);
  await agent.post('/api/v1/auth/register').send(account).expect(201);
  return { app, agent, categories };
}

async function createCategory(
  agent: Awaited<ReturnType<typeof setup>>['agent'],
  name: string,
  type: 'INCOME' | 'EXPENSE',
) {
  const res = await agent.post('/api/v1/categories').send({ name, type }).expect(201);
  return res.body.category as { id: string; name: string; type: string };
}

describe('GET /api/v1/categories', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(buildTestApp()).get('/api/v1/categories');
    expect(res.status).toBe(401);
  });

  it('lista las categorías con la cantidad de movimientos y permite filtrar por tipo', async () => {
    const { agent, categories } = await setup();
    const food = await createCategory(agent, 'Comida', 'EXPENSE');
    await createCategory(agent, 'Sueldo', 'INCOME');
    categories.movementCounts.set(food.id, 3);

    const all = await agent.get('/api/v1/categories').expect(200);
    expect(all.body.categories).toHaveLength(2);

    const expenses = await agent.get('/api/v1/categories?type=EXPENSE').expect(200);
    expect(expenses.body.categories).toEqual([
      expect.objectContaining({ name: 'Comida', type: 'EXPENSE', movementCount: 3 }),
    ]);
  });

  it('rechaza un tipo inválido', async () => {
    const { agent } = await setup();
    await agent.get('/api/v1/categories?type=OTRO').expect(400);
  });
});

describe('POST /api/v1/categories', () => {
  it('crea una categoría propia (no predeterminada)', async () => {
    const { agent } = await setup();
    const res = await agent
      .post('/api/v1/categories')
      .send({ name: '  Mascotas ', type: 'EXPENSE' });

    expect(res.status).toBe(201);
    expect(res.body.category).toMatchObject({
      name: 'Mascotas',
      type: 'EXPENSE',
      isDefault: false,
      movementCount: 0,
    });
  });

  it('no permite repetir el nombre en el mismo tipo, sin importar mayúsculas', async () => {
    const { agent } = await setup();
    await createCategory(agent, 'Mascotas', 'EXPENSE');
    const res = await agent.post('/api/v1/categories').send({ name: 'MASCOTAS', type: 'EXPENSE' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_ALREADY_EXISTS');
  });

  it('sí permite el mismo nombre en el otro tipo', async () => {
    const { agent } = await setup();
    await createCategory(agent, 'Otros', 'EXPENSE');
    await agent.post('/api/v1/categories').send({ name: 'Otros', type: 'INCOME' }).expect(201);
  });

  it('valida nombre y tipo', async () => {
    const { agent } = await setup();
    const res = await agent.post('/api/v1/categories').send({ name: 'x', type: 'AHORRO' });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['name', 'type']));
  });
});

describe('PATCH /api/v1/categories/:id', () => {
  it('cambia el nombre pero ignora un cambio de tipo', async () => {
    const { agent } = await setup();
    const category = await createCategory(agent, 'Mascotas', 'EXPENSE');
    const res = await agent
      .patch(`/api/v1/categories/${category.id}`)
      .send({ name: 'Mascota', type: 'INCOME' });

    expect(res.status).toBe(200);
    expect(res.body.category).toMatchObject({ name: 'Mascota', type: 'EXPENSE' });
  });

  it('permite cambiar solo las mayúsculas de su propio nombre', async () => {
    const { agent } = await setup();
    const category = await createCategory(agent, 'mascotas', 'EXPENSE');
    await agent.patch(`/api/v1/categories/${category.id}`).send({ name: 'Mascotas' }).expect(200);
  });

  it('no permite usar el nombre de otra categoría del mismo tipo', async () => {
    const { agent } = await setup();
    await createCategory(agent, 'Mascotas', 'EXPENSE');
    const other = await createCategory(agent, 'Hogar', 'EXPENSE');

    const res = await agent.patch(`/api/v1/categories/${other.id}`).send({ name: 'mascotas' });
    expect(res.status).toBe(409);
  });

  it('responde 404 si no existe y 400 si el id no es válido', async () => {
    const { agent } = await setup();
    await agent
      .patch('/api/v1/categories/00000000-0000-4000-8000-000000000000')
      .send({ name: 'Nueva' })
      .expect(404);
    await agent.patch('/api/v1/categories/no-es-un-id').send({ name: 'Nueva' }).expect(400);
  });
});

describe('DELETE /api/v1/categories/:id', () => {
  it('elimina una categoría sin movimientos', async () => {
    const { agent } = await setup();
    const category = await createCategory(agent, 'Mascotas', 'EXPENSE');

    await agent.delete(`/api/v1/categories/${category.id}`).expect(204);
    const list = await agent.get('/api/v1/categories').expect(200);
    expect(list.body.categories).toHaveLength(0);
  });

  it('RN-09: con movimientos y sin destino responde 409', async () => {
    const { agent, categories } = await setup();
    const category = await createCategory(agent, 'Mascotas', 'EXPENSE');
    categories.movementCounts.set(category.id, 2);

    const res = await agent.delete(`/api/v1/categories/${category.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_IN_USE');
  });

  it('con destino del mismo tipo, pasa los movimientos y elimina', async () => {
    const { agent, categories } = await setup();
    const from = await createCategory(agent, 'Mascotas', 'EXPENSE');
    const to = await createCategory(agent, 'Hogar', 'EXPENSE');
    categories.movementCounts.set(from.id, 2);

    await agent.delete(`/api/v1/categories/${from.id}?reassignTo=${to.id}`).expect(204);
    expect(categories.movementCounts.get(to.id)).toBe(2);
  });

  it('rechaza un destino de otro tipo', async () => {
    const { agent, categories } = await setup();
    const from = await createCategory(agent, 'Mascotas', 'EXPENSE');
    const to = await createCategory(agent, 'Sueldo', 'INCOME');
    categories.movementCounts.set(from.id, 1);

    const res = await agent.delete(`/api/v1/categories/${from.id}?reassignTo=${to.id}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CATEGORY_TYPE_MISMATCH');
  });

  it('rechaza reasignar a la misma categoría o a una que no existe', async () => {
    const { agent, categories } = await setup();
    const from = await createCategory(agent, 'Mascotas', 'EXPENSE');
    categories.movementCounts.set(from.id, 1);

    await agent.delete(`/api/v1/categories/${from.id}?reassignTo=${from.id}`).expect(400);
    await agent
      .delete(`/api/v1/categories/${from.id}?reassignTo=00000000-0000-4000-8000-000000000000`)
      .expect(400);
  });

  it('exige el token CSRF', async () => {
    const { app } = await setup();
    const res = await withCsrf(request(app).delete('/api/v1/categories/x')).set(
      'X-CSRF-Token',
      'incorrecto',
    );
    expect(res.status).toBe(403);
  });
});
