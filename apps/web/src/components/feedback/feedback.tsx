import type { ReactNode } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOffIcon } from '../ui/icons';

/** Silueta gris con la forma del contenido mientras carga (skeleton). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-faint ${className}`} />;
}

/** Esqueleto de una página completa: se muestra mientras llega su código (lazy loading). */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Estado vacío: explica por qué no hay nada y qué hacer a continuación. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-card border border-line bg-card px-6 py-14 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-muted">{description}</p>
      {action}
    </section>
  );
}

/** Aviso fijo cuando el navegador pierde la conexión. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-bg shadow-lg"
    >
      <WifiOffIcon />
      Sin conexión. Tus cambios se enviarán al volver a conectarte.
    </div>
  );
}
