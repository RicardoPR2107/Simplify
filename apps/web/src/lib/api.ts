import { ErrorCode, errorMessages, type ApiErrorBody } from '@simplify/shared';

const BASE = '/api/v1';
const CSRF_COOKIE = 'simplify_csrf';
/** Código propio del frontend: la petición no llegó al servidor (sin red, servidor caído). */
export const NETWORK_ERROR = 'NETWORK_ERROR';

/** Error de la API con el código, el mensaje para la persona y los errores por campo. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | typeof NETWORK_ERROR,
    message: string,
    readonly status: number,
    readonly fields: Record<string, string[]> = {},
    /** Segundos de espera que indica un 429. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Rutas en las que un 401 es una respuesta normal y no debe intentar renovar la sesión. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshing: Promise<boolean> | null = null;

/**
 * Cliente HTTP de la app (patrón Fachada): el resto del código no conoce `fetch`, cookies ni CSRF.
 * - Envía las cookies de sesión (mismo origen gracias al proxy de Vite / Nginx).
 * - Añade el token CSRF en toda petición que modifica datos.
 * - Si el token de acceso venció (401), renueva la sesión una sola vez y repite la petición.
 */
export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body);

  if (response.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) return parse<T>(await send(method, path, body));
  }
  return parse<T>(response);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

async function send(method: Method, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();

  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      NETWORK_ERROR,
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      0,
    );
  }
}

/**
 * Varias peticiones pueden recibir 401 a la vez (por ejemplo, al abrir el dashboard).
 * Todas esperan la MISMA renovación: si cada una renovara, el servidor detectaría
 * la reutilización del token y cerraría la sesión.
 */
function refreshSession(): Promise<boolean> {
  refreshing ??= send('POST', '/auth/refresh')
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function csrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  const response = await fetch(`${BASE}/auth/csrf`, { credentials: 'same-origin' });
  const data = (await response.json()) as { csrfToken: string };
  return data.csrfToken;
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (response.ok) return data as T;

  const error = (data as ApiErrorBody | null)?.error;
  // Un 5xx sin el formato de la API no viene de ella, sino de lo que está delante
  // (el proxy de Vite o Nginx): la API no responde, por ejemplo porque aún está arrancando.
  const code =
    error?.code ??
    (response.status >= 500 ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.INTERNAL_ERROR);
  const retryAfter = Number(response.headers.get('Retry-After')) || undefined;
  throw new ApiError(
    code,
    error?.message ?? errorMessages[code],
    response.status,
    error?.fields,
    retryAfter,
  );
}

/** Solo para pruebas: olvida una renovación en curso. */
export function resetApiState(): void {
  refreshing = null;
}
