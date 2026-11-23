import { Link } from 'react-router';
import { EmptyState, Skeleton } from '../components/feedback/feedback';
import { Loadable, Panel } from '../components/ui/Panel';
import { useCurrentUser } from '../features/auth/useAuth';
import { useCategorySummary, useEvolution, useMonthSummary } from '../features/dashboard/api';
import { EvolutionChart } from '../features/dashboard/EvolutionChart';
import { MonthNavigator } from '../features/dashboard/MonthNavigator';
import { CategoryBreakdown } from '../features/dashboard/CategoryBreakdown';
import { periodLabel, useDashboardPeriod } from '../features/dashboard/period';
import { RecentMovements } from '../features/dashboard/RecentMovements';
import { SummaryCards } from '../features/dashboard/SummaryCards';
import { useMovements } from '../features/movements/api';

const RECENT = 5;

/** Dashboard: el resumen del mes elegido y la actividad reciente (RF-14 a RF-17). */
export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const currency = user?.currency ?? 'USD';
  const firstName = user?.name.split(' ')[0];
  const { period, isCurrent, previous, next, reset } = useDashboardPeriod();
  const { year, month } = period;

  const summary = useMonthSummary(year, month);
  const categories = useCategorySummary(year, month, 'EXPENSE');
  const evolution = useEvolution(year, month);
  const recent = useMovements({ page: 1, sortBy: 'date', order: 'desc' });

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  const monthQuery = `from=${year}-${mm}-01&to=${year}-${mm}-${lastDay}`;
  const label = periodLabel(period);

  const hasNoMovements = recent.data?.total === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {firstName ? `Hola, ${firstName}` : 'Hola'}
          </h1>
          <p className="text-muted">Así van tus finanzas.</p>
        </div>
        {!hasNoMovements && (
          <MonthNavigator label={label} isCurrent={isCurrent} onPrevious={previous} onNext={next} />
        )}
      </div>

      {hasNoMovements ? (
        <EmptyState
          title="Empieza registrando tu primer movimiento"
          description="Cuando registres tus ingresos y gastos, aquí verás tu balance del mes, en qué categorías usas tu dinero y cómo evoluciona mes a mes."
          action={
            <Link
              to="/historial?nuevo=1"
              className="flex h-12 items-center rounded-full bg-hero px-6 font-semibold text-on-hero"
            >
              Registrar movimiento
            </Link>
          }
        />
      ) : (
        <>
          <Loadable query={summary} skeleton={<Skeleton className="h-44" />}>
            {(data) => <SummaryCards summary={data} currency={currency} />}
          </Loadable>
          {!isCurrent && (
            <button
              type="button"
              onClick={reset}
              className="-mt-2 self-start text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              Volver al mes actual
            </button>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Evolución de los últimos 6 meses">
              <Loadable query={evolution} skeleton={<Skeleton className="h-72" />}>
                {(data) => <EvolutionChart months={data.months} currency={currency} />}
              </Loadable>
            </Panel>
            <Panel
              title="Gastos por categoría"
              action={
                <Link
                  to={`/historial?type=EXPENSE&${monthQuery}`}
                  className="shrink-0 text-sm font-semibold text-accent hover:underline"
                >
                  Ver gastos
                </Link>
              }
            >
              <Loadable query={categories} skeleton={<Skeleton className="h-72" />}>
                {(data) =>
                  data.items.length === 0 ? (
                    <p className="py-10 text-center text-muted">
                      No registraste gastos en {label.toLowerCase()}.
                    </p>
                  ) : (
                    <CategoryBreakdown summary={data} currency={currency} monthQuery={monthQuery} />
                  )
                }
              </Loadable>
            </Panel>
          </div>

          <Panel
            title="Últimos movimientos"
            action={
              <Link to="/historial" className="text-sm font-semibold text-accent hover:underline">
                Ver todo
              </Link>
            }
          >
            <Loadable query={recent} skeleton={<Skeleton className="h-56" />}>
              {(data) => (
                <RecentMovements movements={data.items.slice(0, RECENT)} currency={currency} />
              )}
            </Loadable>
          </Panel>
        </>
      )}
    </div>
  );
}
