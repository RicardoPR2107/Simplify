import { useId, type ReactNode } from 'react';
import { describeError } from '../../features/auth/forms';
import { FormAlert } from './form';

/** Tarjeta con título (y acción opcional) que agrupa un bloque de información. */
export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-5 rounded-card border border-line bg-card p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Cada bloque carga por separado: si uno falla, los demás siguen visibles y ese ofrece reintentar. */
export function Loadable<T>({
  query,
  skeleton,
  children,
}: {
  query: QueryLike<T>;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <div role="status">
        <span className="sr-only">Cargando…</span>
        {skeleton}
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormAlert>{describeError(query.error)}</FormAlert>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="h-10 rounded-full border border-line px-4 text-sm font-semibold hover:bg-faint"
        >
          Reintentar
        </button>
      </div>
    );
  }
  return children(query.data);
}
