import { describe, expect, it } from 'vitest';
import { mockApi, unauthenticated } from '../test/api-mock';
import { api, ApiError } from './api';

describe('Cliente de la API', () => {
  it('envía el token CSRF de la cookie en las peticiones que modifican datos', async () => {
    document.cookie = 'simplify_csrf=desde-cookie; path=/';
    const mock = mockApi({ 'POST /auth/logout': { status: 204 } });

    await api.post('/auth/logout');
    expect(mock.calls[0]!.headers['X-CSRF-Token']).toBe('desde-cookie');
  });

  it('si no hay cookie CSRF, la pide antes de enviar', async () => {
    const mock = mockApi({ 'POST /auth/logout': { status: 204 } });

    await api.post('/auth/logout');
    expect(mock.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /auth/csrf',
      'POST /auth/logout',
    ]);
    expect(mock.calls[1]!.headers['X-CSRF-Token']).toBe('csrf-test');
  });

  it('las lecturas (GET) no llevan token CSRF', async () => {
    const mock = mockApi({ 'GET /me': { body: { user: {} } } });
    await api.get('/me');
    expect(mock.calls[0]!.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('si el token de acceso venció, renueva la sesión y repite la petición', async () => {
    const mock = mockApi({
      'GET /me': (_body, call) => (call === 1 ? unauthenticated : { body: { user: { id: '1' } } }),
      'POST /auth/refresh': { status: 204 },
    });

    expect(await api.get('/me')).toEqual({ user: { id: '1' } });
    expect(mock.calls.filter((c) => c.path === '/auth/refresh')).toHaveLength(1);
  });

  it('varias peticiones con 401 a la vez comparten una sola renovación', async () => {
    let refreshes = 0;
    mockApi({
      'GET /movements': (_b, call) => (call <= 3 ? unauthenticated : { body: { items: [] } }),
      'POST /auth/refresh': async () => {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { status: 204 };
      },
    });

    await Promise.all([api.get('/movements'), api.get('/movements'), api.get('/movements')]);
    expect(refreshes).toBe(1);
  });

  it('si la renovación falla, devuelve el 401 original', async () => {
    mockApi({ 'GET /me': unauthenticated, 'POST /auth/refresh': unauthenticated });

    await expect(api.get('/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
  });

  it('un 401 en el inicio de sesión no intenta renovar (es una respuesta normal)', async () => {
    const mock = mockApi({
      'POST /auth/login': {
        status: 401,
        body: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'El correo o la contraseña no son correctos.',
          },
        },
      },
    });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(mock.calls.some((c) => c.path === '/auth/refresh')).toBe(false);
  });

  it('convierte la respuesta de error en ApiError con campos y Retry-After', async () => {
    mockApi({
      'POST /auth/login': {
        status: 429,
        headers: { 'Retry-After': '600' },
        body: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos.' } },
      },
    });

    const error = await api.post('/auth/login', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'TOO_MANY_ATTEMPTS', status: 429, retryAfter: 600 });
  });

  it('sin conexión lanza un error de red con un mensaje claro', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.get('/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('No pudimos conectar'),
    });
  });
});
