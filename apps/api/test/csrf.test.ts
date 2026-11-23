import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp, csrfAgent, TEST_CSRF_TOKEN } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

describe('Protección CSRF (doble envío)', () => {
  it('GET /auth/csrf entrega el token en una cookie legible por el frontend', async () => {
    const res = await request(buildTestApp()).get('/api/v1/auth/csrf');
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('simplify_csrf='),
    );

    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookie).toContain(res.body.csrfToken);
    expect(cookie).not.toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('si ya hay un token válido, lo conserva', async () => {
    const res = await request(buildTestApp())
      .get('/api/v1/auth/csrf')
      .set('Cookie', `simplify_csrf=${TEST_CSRF_TOKEN}`);
    expect(res.body.csrfToken).toBe(TEST_CSRF_TOKEN);
  });

  it('rechaza con 403 un POST sin token', async () => {
    const res = await request(buildTestApp()).post('/api/v1/auth/register').send(account);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rechaza un POST con cookie pero sin cabecera (lo que haría un sitio ajeno)', async () => {
    const res = await request(buildTestApp())
      .post('/api/v1/auth/login')
      .set('Cookie', `simplify_csrf=${TEST_CSRF_TOKEN}`)
      .send({ email: account.email, password: account.password });
    expect(res.status).toBe(403);
  });

  it('rechaza un POST cuya cabecera no coincide con la cookie', async () => {
    const res = await request(buildTestApp())
      .post('/api/v1/auth/logout')
      .set('Cookie', `simplify_csrf=${TEST_CSRF_TOKEN}`)
      .set('X-CSRF-Token', 'otro-token');
    expect(res.status).toBe(403);
  });

  it('acepta el flujo del frontend: pedir el token y enviarlo en la cabecera', async () => {
    const agent = await csrfAgent(buildTestApp());
    await agent.post('/api/v1/auth/register').send(account).expect(201);
    await agent.get('/api/v1/me').expect(200);
  });

  it('las peticiones de solo lectura no necesitan token', async () => {
    const res = await request(buildTestApp()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
  });

  it('el CORS permite al frontend enviar la cabecera X-CSRF-Token', async () => {
    const res = await request(buildTestApp())
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token');
    expect(res.headers['access-control-allow-headers']).toMatch(/X-CSRF-Token/i);
  });
});
