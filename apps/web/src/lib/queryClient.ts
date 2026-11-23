import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';
import { ME_QUERY_KEY } from '../features/auth/useAuth';

/**
 * Si cualquier petición confirma que la sesión terminó (ni siquiera se pudo renovar),
 * se marca al usuario como desconectado: las rutas protegidas redirigen al inicio de sesión.
 */
function handleError(client: () => QueryClient) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
      client().setQueryData(ME_QUERY_KEY, null);
    }
  };
}

/** Errores pasajeros: vale la pena reintentar (sin red, o la API todavía no responde). */
function isTransient(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'NETWORK_ERROR' || error.code === 'SERVICE_UNAVAILABLE')
  );
}

interface QueryClientOptions {
  /** Espera entre reintentos. Por defecto crece: 1 s, 2 s, 4 s. Las pruebas usan 0. */
  retryDelay?: number;
}

export function createQueryClient({ retryDelay }: QueryClientOptions = {}): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError(() => client) }),
    mutationCache: new MutationCache({ onError: handleError(() => client) }),
    defaultOptions: {
      queries: {
        // Evita pedir lo mismo al backend una y otra vez.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Reintentar no arregla un error de la API (400, 401, 404…); solo uno pasajero.
        retry: (failures, error) => failures < 3 && isTransient(error),
        ...(retryDelay !== undefined && { retryDelay }),
      },
    },
  });
  return client;
}
