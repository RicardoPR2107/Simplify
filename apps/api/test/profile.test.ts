import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp, csrfAgent, withCsrf } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

async function loggedIn() {
  const agent = await csrfAgent(buildTestApp());
  await agent.post('/api/v1/auth/register').send(account).expect(201);
  return agent;
}

describe('PATCH /api/v1/me (RF-04, RF-18)', () => {
  it('cambia el nombre y la moneda', async () => {
    const agent = await loggedIn();
    const res = await agent.patch('/api/v1/me').send({ name: 'Ricardo Palma', currency: 'PEN' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Ricardo Palma', currency: 'PEN' });
    const me = await agent.get('/api/v1/me');
    expect(me.body.user.currency).toBe('PEN');
  });

  it('permite cambiar un solo campo', async () => {
    const agent = await loggedIn();
    const res = await agent.patch('/api/v1/me').send({ currency: 'EUR' });

    expect(res.body.user).toMatchObject({ name: 'Ricardo', currency: 'EUR' });
  });

  it('recorta los espacios del nombre', async () => {
    const agent = await loggedIn();
    const res = await agent.patch('/api/v1/me').send({ name: '  Ricardo  ' });
    expect(res.body.user.name).toBe('Ricardo');
  });

  it('rechaza una moneda no soportada', async () => {
    const agent = await loggedIn();
    const res = await agent.patch('/api/v1/me').send({ currency: 'BTC' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.currency).toBeDefined();
  });

  it('rechaza un cuerpo vacío', async () => {
    const agent = await loggedIn();
    const res = await agent.patch('/api/v1/me').send({});
    expect(res.status).toBe(400);
  });

  it('no permite cambiar el correo, el id ni la contraseña por esta vía', async () => {
    const agent = await loggedIn();
    const res = await agent
      .patch('/api/v1/me')
      .send({ email: 'otro@example.com', id: 'otro-id', passwordHash: 'x' });

    // Tras descartar los campos no permitidos no queda nada que actualizar.
    expect(res.status).toBe(400);
    const me = await agent.get('/api/v1/me');
    expect(me.body.user.email).toBe('ricardo@example.com');
  });

  it('sin sesión responde 401', async () => {
    const res = await withCsrf(request(buildTestApp()).patch('/api/v1/me')).send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('sin token CSRF responde 403 aunque haya sesión', async () => {
    const app = buildTestApp();
    const agent = request.agent(app);
    await withCsrf(agent.post('/api/v1/auth/register')).send(account).expect(201);

    const res = await agent.patch('/api/v1/me').send({ name: 'Atacante' });
    expect(res.status).toBe(403);
  });
});
