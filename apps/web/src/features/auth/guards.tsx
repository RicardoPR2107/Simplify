import type { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import { safeRedirect } from './redirect';
import { Logomark } from '../../components/brand/Logo';
import { useCurrentUser } from './useAuth';

/** Pantalla mientras se comprueba si hay sesión (la primera petición al abrir la app). */
export function FullScreenLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-bg"
    >
      <div className="animate-pulse">
        <Logomark size={56} decorative />
      </div>
      <span className="sr-only">Cargando Simplify…</span>
    </div>
  );
}

/**
 * El servidor no respondió ni tras varios reintentos (sin conexión, o la API aún arranca).
 * En vez de un error genérico, se explica qué pasa y se ofrece volver a intentarlo.
 */
export function ServiceUnavailable({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <section
        role="alert"
        className="flex max-w-md flex-col items-center gap-4 rounded-card border border-line bg-card px-8 py-14 text-center"
      >
        <Logomark size={56} decorative />
        <h1 className="text-2xl font-semibold">No pudimos conectar con Simplify</h1>
        <p className="text-muted">
          El servidor no responde en este momento. Revisa tu conexión e inténtalo de nuevo en unos
          segundos.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="h-12 rounded-full bg-hero px-6 hover:bg-hero-hover font-semibold text-on-hero disabled:opacity-70"
        >
          {retrying ? 'Conectando…' : 'Reintentar'}
        </button>
      </section>
    </main>
  );
}

/** Solo deja pasar con sesión; si no, lleva al inicio de sesión y recuerda a dónde se quería ir. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, isError, refetch, isFetching } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullScreenLoader />;
  if (isError) return <ServiceUnavailable onRetry={() => void refetch()} retrying={isFetching} />;
  if (!user) {
    const target = location.pathname + location.search;
    const redirect = target === '/' ? '' : `?redirect=${encodeURIComponent(target)}`;
    return <Navigate to={`/iniciar-sesion${redirect}`} replace />;
  }
  return children;
}

/**
 * Inicio de sesión y registro: si ya hay sesión, no tiene sentido mostrarlos.
 * También es lo que lleva a la persona a su destino justo después de entrar.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const [params] = useSearchParams();
  if (isPending) return <FullScreenLoader />;
  if (user) return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  return children;
}
