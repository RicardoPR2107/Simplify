import { Skeleton } from '../components/feedback/feedback';
import { Loadable, Panel } from '../components/ui/Panel';
import { useCurrentUser } from '../features/auth/useAuth';
import { useCategorySummary, useEvolution } from '../features/dashboard/api';
import { CategoryBreakdown } from '../features/dashboard/CategoryBreakdown';
import { MonthNavigator } from '../features/dashboard/MonthNavigator';
import { periodLabel, shiftPeriod, useDashboardPeriod } from '../features/dashboard/period';
import { BalanceChart } from '../features/stats/BalanceChart';
import { computeStats, type PeriodStats } from '../features/stats/metrics';
import { formatMoney } from '../lib/format';
import type { Currency } from '@simplify/shared';

/** Estadísticas: análisis de los 6 meses que terminan en el mes elegido. */
export default function StatsPage() {
  const { data: user } = useCurrentUser();
  const currency = user?.currency ?? 'USD';
  const { period, isCurrent, previous, next } = useDashboardPeriod();
  const { year, month } = period;
  const evolution = useEvolution(year, month);
  const incomes = useCategorySummary(year, month, 'INCOME');

  const start = shiftPeriod(period, -5);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  const monthQuery = `from=${year}-${mm}-01&to=${year}-${mm}-${lastDay}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Estadísticas</h1>
          <p className="text-muted">
            De {periodLabel(start).toLowerCase()} a {periodLabel(period).toLowerCase()}.
          </p>
        </div>
        <MonthNavigator
          label={periodLabel(period)}
          isCurrent={isCurrent}
          onPrevious={previous}
          onNext={next}
        />
      </div>

      <Loadable query={evolution} skeleton={<Skeleton className="h-36" />}>
        {(data) => <Indicators stats={computeStats(data.months)} currency={currency} />}
      </Loadable>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Balance por mes">
          <Loadable query={evolution} skeleton={<Skeleton className="h-72" />}>
            {(data) => <BalanceChart months={data.months} currency={currency} />}
          </Loadable>
        </Panel>
        <Panel title={`Ingresos por categoría · ${periodLabel(period, 'short')}`}>
          <Loadable query={incomes} skeleton={<Skeleton className="h-72" />}>
            {(data) =>
              data.items.length === 0 ? (
                <p className="py-10 text-center text-muted">
                  No registraste ingresos en {periodLabel(period).toLowerCase()}.
                </p>
              ) : (
                <CategoryBreakdown summary={data} currency={currency} monthQuery={monthQuery} />
              )
            }
          </Loadable>
        </Panel>
      </div>

      <Panel title="Detalle mensual">
        <Loadable query={evolution} skeleton={<Skeleton className="h-64" />}>
          {(data) => <MonthlyTable stats={computeStats(data.months)} currency={currency} />}
        </Loadable>
      </Panel>
    </div>
  );
}

function rate(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function Indicators({ stats, currency }: { stats: PeriodStats; currency: Currency }) {
  const negative = stats.balance.startsWith('-');
  const items = [
    {
      label: 'Ahorro en 6 meses',
      value: formatMoney(
        stats.balance.replace('-', ''),
        currency,
        negative ? 'EXPENSE' : undefined,
      ),
      hint: `${formatMoney(stats.income, currency)} de ingresos`,
    },
    {
      label: 'Tasa de ahorro',
      value: rate(stats.savingsRate),
      hint:
        stats.savingsRate === null
          ? 'Sin ingresos en el periodo'
          : 'De cada 100 que entran, cuánto queda',
    },
    {
      label: 'Gasto promedio mensual',
      value: formatMoney(stats.averageExpense, currency),
      hint: `${formatMoney(stats.expense, currency)} en total`,
    },
    {
      label: 'Mes con más gastos',
      value: stats.highestExpense ? periodLabel(stats.highestExpense) : '—',
      hint: stats.highestExpense
        ? formatMoney(stats.highestExpense.expense, currency)
        : 'Sin gastos en el periodo',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-2 rounded-card border border-line bg-card p-5"
        >
          <dt className="text-sm font-medium text-muted">{item.label}</dt>
          <dd className="tabular text-lg font-semibold tracking-tight md:text-2xl">{item.value}</dd>
          <dd className="tabular text-xs text-muted md:text-sm">{item.hint}</dd>
        </div>
      ))}
      {stats.deficitMonths > 0 && (
        <p className="col-span-2 text-sm text-muted xl:col-span-4">
          En {stats.deficitMonths} {stats.deficitMonths === 1 ? 'mes' : 'meses'} del periodo
          gastaste más de lo que ingresó.
        </p>
      )}
    </dl>
  );
}

function MonthlyTable({ stats, currency }: { stats: PeriodStats; currency: Currency }) {
  const cell = 'border-b border-line px-4 py-3';
  return (
    <div className="-mx-6 overflow-x-auto px-6">
      <table className="tabular w-full min-w-[560px] text-sm">
        <caption className="sr-only">Ingresos, gastos, balance y tasa de ahorro por mes</caption>
        <thead>
          <tr className="text-left text-muted">
            <th scope="col" className={`${cell} pl-0 font-medium`}>
              Mes
            </th>
            <th scope="col" className={`${cell} text-right font-medium`}>
              Ingresos
            </th>
            <th scope="col" className={`${cell} text-right font-medium`}>
              Gastos
            </th>
            <th scope="col" className={`${cell} text-right font-medium`}>
              Balance
            </th>
            <th scope="col" className={`${cell} pr-0 text-right font-medium`}>
              Ahorro
            </th>
          </tr>
        </thead>
        <tbody>
          {[...stats.rows].reverse().map((row) => (
            <tr key={`${row.year}-${row.month}`}>
              <th scope="row" className={`${cell} pl-0 text-left font-medium`}>
                {periodLabel(row)}
              </th>
              <td className={`${cell} text-right`}>{formatMoney(row.income, currency)}</td>
              <td className={`${cell} text-right`}>{formatMoney(row.expense, currency)}</td>
              <td className={`${cell} text-right font-semibold`}>
                {formatMoney(row.balance, currency)}
              </td>
              <td className={`${cell} pr-0 text-right`}>{rate(row.savingsRate)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="px-4 py-3 pl-0 text-left">
              Total
            </th>
            <td className="px-4 py-3 text-right">{formatMoney(stats.income, currency)}</td>
            <td className="px-4 py-3 text-right">{formatMoney(stats.expense, currency)}</td>
            <td className="px-4 py-3 text-right">{formatMoney(stats.balance, currency)}</td>
            <td className="px-4 py-3 pr-0 text-right">{rate(stats.savingsRate)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
