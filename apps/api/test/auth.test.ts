import { describe, expect, it } from 'vitest';
import { buildTestApp, post } from './helpers.js';

const body = { name: 'Ricardo', email: 'Ricardo@Example.com', password: 'Clave#Segura123' };

describe('POST /api/v1/auth/register', () => {
  it('responde 201 con el perfil y el correo normalizado', async () => {
    const res = await post(buildTestApp(), '/api/v1/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: 'Ricardo',
      email: 'ricardo@example.com',
      currency: 'USD',
    });
  });

  it('nunca devuelve la contraseña ni su hash', async () => {
    const res = await post(buildTestApp(), '/api/v1/auth/register').send(body);

    const text = JSON.stringify(res.body);
    expect(text).not.toContain('Clave#Segura123');
    expect(text).not.toContain('passwordHash');
  });

  it('responde 409 si el correo ya existe, aunque cambien las mayúsculas', async () => {
    const app = buildTestApp();
    await post(app, '/api/v1/auth/register').send(body);
    const res = await post(app, '/api/v1/auth/register').send({
      ...body,
      email: 'RICARDO@example.com',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('responde 400 con los errores de cada campo', async () => {
    const res = await post(buildTestApp(), '/api/v1/auth/register').send({
      name: 'R',
      email: 'no-es-correo',
      password: 'corta',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it('ignora campos extra como la moneda o un id (evita la asignación masiva)', async () => {
    const res = await post(buildTestApp(), '/api/v1/auth/register').send({
      ...body,
      id: 'id-elegido-por-el-atacante',
      currency: 'EUR',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.id).not.toBe('id-elegido-por-el-atacante');
    expect(res.body.user.currency).toBe('USD');
  });
});
