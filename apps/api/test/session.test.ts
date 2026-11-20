import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

const account = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

/** Extrae `nombre=valor` de las cabeceras Set-Cookie de una respuesta. */
function cookies(res: request.Response): Record<string, string> {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  return Object.fromEntries(
    (header ?? []).map((line) => {
      const [pair] = line.split(';');
      const index = pair!.indexOf('=');
      return [pair!.slice(0, index), line];
    }),
  );
}

function cookieValue(line: string | undefined): string {
  return line ? line.split(';')[0]!.split('=').slice(1).join('=') : '';
}

async function registeredAgent() {
  const agent = request.agent(buildTestApp());
  await agent.post('/api/v1/auth/register').send(account).expect(201);
  return agent;
}

describe('Cookies de sesión', () => {
  it('el registro inicia sesión con cookies httpOnly y SameSite=Lax', async () => {
    const res = await request(buildTestApp()).post('/api/v1/auth/register').send(account);
    const set = cookies(res);

    expect(set.simplify_at).toMatch(/HttpOnly/);
    expect(set.simplify_at).toMatch(/SameSite=Lax/);
    expect(set.simplify_at).toMatch(/Path=\//);
    expect(set.simplify_rt).toMatch(/HttpOnly/);
    // El token de renovación solo viaja a las rutas de autenticación.
    expect(set.simplify_rt).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('los tokens nunca aparecen en el cuerpo de la respuesta', async () => {
    const res = await request(buildTestApp()).post('/api/v1/auth/register').send(account);
    const body = JSON.stringify(res.body);

    expect(body).not.toContain(cookieValue(cookies(res).simplify_at));
    expect(body).not.toContain(cookieValue(cookies(res).simplify_rt));
  });
});

describe('POST /api/v1/auth/login (RF-02)', () => {
  it('inicia sesión con credenciales correctas', async () => {
    const app = buildTestApp();
    await request(app).post('/api/v1/auth/register').send(account);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'RICARDO@example.com', password: account.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ricardo@example.com');
    expect(cookies(res).simplify_at).toBeDefined();
  });

  it('responde igual si el correo no existe o si la contraseña es incorrecta', async () => {
    const app = buildTestApp();
    await request(app).post('/api/v1/auth/register').send(account);

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: 'Otra#Clave123' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@example.com', password: 'Otra#Clave123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
    expect(cookies(wrongPassword).simplify_at).toBeUndefined();
  });
});

describe('GET /api/v1/me', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(buildTestApp()).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('con sesión devuelve el perfil del usuario', async () => {
    const agent = await registeredAgent();
    const res = await agent.get('/api/v1/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Ricardo', email: 'ricardo@example.com' });
  });

  it('rechaza un token de acceso falsificado', async () => {
    const res = await request(buildTestApp())
      .get('/api/v1/me')
      .set('Cookie', 'simplify_at=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.firma-falsa');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('entrega un token de renovación nuevo y mantiene la sesión', async () => {
    const app = buildTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(account);
    const firstRefresh = cookieValue(cookies(registered).simplify_rt);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `simplify_rt=${firstRefresh}`);
    expect(res.status).toBe(204);
    expect(cookieValue(cookies(res).simplify_rt)).not.toBe(firstRefresh);
  });

  it('un token de renovación usado dos veces cierra la sesión', async () => {
    const app = buildTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(account);
    const stolen = cookieValue(cookies(registered).simplify_rt);

    const legit = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `simplify_rt=${stolen}`);
    const attacker = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `simplify_rt=${stolen}`);
    expect(attacker.status).toBe(401);

    // La sesión legítima también se cerró: hay que volver a iniciar sesión.
    const newRefresh = cookieValue(cookies(legit).simplify_rt);
    const after = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `simplify_rt=${newRefresh}`);
    expect(after.status).toBe(401);
  });

  it('sin token de renovación responde 401', async () => {
    const res = await request(buildTestApp()).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout (RF-03)', () => {
  it('borra las cookies y el token de renovación deja de servir', async () => {
    const app = buildTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(account);
    const refresh = cookieValue(cookies(registered).simplify_rt);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `simplify_rt=${refresh}`);
    expect(res.status).toBe(204);
    expect(cookies(res).simplify_at).toMatch(/Expires=Thu, 01 Jan 1970/);

    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `simplify_rt=${refresh}`);
    expect(reuse.status).toBe(401);
  });

  it('sin sesión también responde 204 (cerrar sesión siempre funciona)', async () => {
    const res = await request(buildTestApp()).post('/api/v1/auth/logout');
    expect(res.status).toBe(204);
  });
});
