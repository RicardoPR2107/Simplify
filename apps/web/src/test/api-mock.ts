import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type Handler =
  MockResponse | ((body: unknown, call: number) => MockResponse | Promise<MockResponse>);

export interface ApiMock {
  /** Peticiones recibidas: método, ruta (sin /api/v1), cuerpo y cabeceras. */
  calls: Array<{ method: string; path: string; body: unknown; headers: Record<string, string> }>;
  on(route: string, handler: Handler): void;
}

/**
 * Sustituye `fetch` por una API falsa. Las rutas se registran como 'POST /auth/login'.
 * Una ruta sin respuesta registrada devuelve 404, para que la prueba falle de forma visible.
 */
export function mockApi(routes: Record<string, Handler> = {}): ApiMock {
  const handlers = new Map(Object.entries(routes));
  const counts = new Map<string, number>();
  const mock: ApiMock = {
    calls: [],
    on: (route, handler) => handlers.set(route, handler),
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      const path = url.replace(/^\/api\/v1/, '').split('?')[0]!;
      const key = `${method} ${path}`;
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      mock.calls.push({
        method,
        path,
        body,
        headers: (init.headers ?? {}) as Record<string, string>,
      });

      const call = (counts.get(key) ?? 0) + 1;
      counts.set(key, call);
      const handler =
        handlers.get(key) ??
        (key === 'GET /auth/csrf' ? { body: { csrfToken: 'csrf-test' } } : undefined);
      const res = typeof handler === 'function' ? await handler(body, call) : handler;
      const status = res?.status ?? (res ? 200 : 404);
      return new Response(
        status === 204
          ? null
          : JSON.stringify(
              res?.body ?? { error: { code: 'NOT_FOUND', message: `Sin mock para ${key}` } },
            ),
        {
          status,
          headers: { 'Content-Type': 'application/json', ...res?.headers },
        },
      );
    }),
  );
  return mock;
}

export const testUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ricardo Palma',
  email: 'ricardo@example.com',
  currency: 'PEN',
};

export const unauthenticated: MockResponse = {
  status: 401,
  body: {
    error: { code: 'UNAUTHENTICATED', message: 'Tu sesión terminó. Vuelve a iniciar sesión.' },
  },
};
