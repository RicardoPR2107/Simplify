import { isRouteErrorResponse, useRouteError } from 'react-router';

/**
 * Pantalla de fallo general (equivalente a una página 500).
 * Aparece si una ruta lanza un error que ningún Error Boundary de sección atrapó,
 * por ejemplo si no se pudo descargar el código de una página.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <section
        role="alert"
        className="flex max-w-md flex-col items-center gap-4 rounded-card border border-line bg-card px-8 py-14 text-center"
      >
        <p className="tabular text-5xl font-bold text-accent">{status}</p>
        <h1 className="text-2xl font-semibold">Algo salió mal</h1>
        <p className="text-muted">
          No pudimos cargar esta pantalla. Revisa tu conexión y vuelve a intentarlo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 rounded-full bg-hero px-6 font-semibold text-on-hero"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
