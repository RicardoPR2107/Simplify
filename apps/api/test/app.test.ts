import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('GET /api/v1/health', () => {
  it('live responde 200 sin tocar la base de datos', async () => {
    const app = buildTestApp({
      database: {
        ping: async () => {
          throw new Error('no debería llamarse');
        },
      },
    });
    const res = await request(app).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('ready responde 200 cuando la base de datos responde', async () => {
    const res = await request(buildTestApp()).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe('up');
  });

  it('ready responde 503 cuando la base de datos no responde (el balanceador saca la instancia)', async () => {
    const app = buildTestApp({
      database: {
        ping: async () => {
          throw new Error('conexión rechazada');
        },
      },
    });
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
  });
});

describe('Manejo de errores', () => {
  it('una ruta inexistente devuelve 404 con el formato estándar', async () => {
    const res = await request(buildTestApp()).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('No encontramos lo que buscas.');
    expect(res.body.error.requestId).toBeTypeOf('string');
  });

  it('un JSON mal formado devuelve 400 y no 500', async () => {
    const res = await request(buildTestApp())
      .post('/api/v1/health/live')
      .set('Content-Type', 'application/json')
      .send('{"roto":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reutiliza el x-request-id recibido para poder rastrear la petición', async () => {
    const res = await request(buildTestApp())
      .get('/api/v1/no-existe')
      .set('x-request-id', 'prueba-123');
    expect(res.headers['x-request-id']).toBe('prueba-123');
    expect(res.body.error.requestId).toBe('prueba-123');
  });
});

describe('Seguridad', () => {
  it('no revela la tecnología del servidor', async () => {
    const res = await request(buildTestApp()).get('/api/v1/health/live');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('envía cabeceras de protección de helmet', async () => {
    const res = await request(buildTestApp()).get('/api/v1/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('solo permite CORS desde el origen del frontend', async () => {
    const permitido = await request(buildTestApp())
      .get('/api/v1/health/live')
      .set('Origin', 'http://localhost:5173');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const ajeno = await request(buildTestApp())
      .get('/api/v1/health/live')
      .set('Origin', 'https://sitio-malicioso.example');
    expect(ajeno.headers['access-control-allow-origin']).not.toBe(
      'https://sitio-malicioso.example',
    );
  });

  it('rechaza cuerpos de más de 100 kb', async () => {
    const res = await request(buildTestApp())
      .post('/api/v1/health/live')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ relleno: 'x'.repeat(120_000) }));
    expect(res.status).toBe(413);
  });
});
