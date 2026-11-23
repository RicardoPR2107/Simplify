import { EmptyState } from '../components/feedback/feedback';

/** Dashboard. Se conecta a datos reales en la Fase 4. */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Hola</h1>
      <EmptyState
        title="Aún no hay movimientos"
        description="Cuando registres tus ingresos y gastos, aquí verás tu balance del mes, la evolución y en qué categorías usas tu dinero."
      />
    </div>
  );
}
