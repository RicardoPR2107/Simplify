import { EmptyState } from '../components/feedback/feedback';

/** Página temporal para módulos que se construyen en fases posteriores. */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      <EmptyState
        title="En construcción"
        description={`Este módulo se construye en la ${phase}.`}
      />
    </div>
  );
}
