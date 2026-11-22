import type { Currency, MonthSummary } from '@simplify/shared';
import { formatMoney } from '../../lib/format';

/**
 * RF-14, RF-15 y RF-17: balance, ingresos y gastos del mes.
 * Es un número clave, no un gráfico: se muestra como cifras grandes.
 * Los números van en el color del texto; el color de cada tipo solo acompaña (punto), nunca es la única pista.
 */
export function SummaryCards({ summary, currency }: { summary: MonthSummary; currency: Currency }) {
  const negative = summary.balance.startsWith('-');
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
      <section
        aria-labelledby="resumen-balance"
        className="col-span-2 flex flex-col justify-between gap-6 rounded-card bg-hero p-6 text-on-hero md:col-span-1"
      >
        <h2 id="resumen-balance" className="text-sm font-medium opacity-80">
          Balance del mes
        </h2>
        <div className="flex flex-col gap-1">
          <p className="tabular text-4xl font-semibold tracking-tight md:text-5xl">
            {formatMoney(
              summary.balance.replace('-', ''),
              currency,
              negative ? 'EXPENSE' : undefined,
            )}
          </p>
          <p className="text-sm opacity-80">
            {negative ? 'Gastaste más de lo que ingresó este mes.' : 'Ingresos menos gastos.'}
          </p>
        </div>
      </section>
      <Tile label="Ingresos" value={formatMoney(summary.income, currency)} dot="bg-chart-income" />
      <Tile label="Gastos" value={formatMoney(summary.expense, currency)} dot="bg-chart-expense" />
    </div>
  );
}

function Tile({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-card border border-line bg-card p-5 md:gap-6 md:p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <span aria-hidden="true" className={`size-2.5 rounded-full ${dot}`} />
        {label}
      </h2>
      <p className="tabular text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
        {value}
      </p>
    </section>
  );
}
