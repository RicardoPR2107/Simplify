import { toCents, type Currency, type MonthSummary } from '@simplify/shared';
import { useState } from 'react';
import { formatCompactMoney, formatMoney } from '../../lib/format';
import { periodLabel } from './period';

/** Pasos "redondos" del eje: 1, 2, 2.5, 5 × 10ⁿ, para que las líneas guía caigan en cifras legibles. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

const toNumber = (amount: string) => Number(toCents(amount)) / 100;

/**
 * RF-16: ingresos y gastos de los últimos 6 meses (barras agrupadas, un solo eje).
 * - Leyenda siempre visible; ingreso a la izquierda y gasto a la derecha en cada mes.
 * - Al pasar el ratón o enfocar un mes con el teclado, un recuadro muestra las cifras exactas.
 * - Una tabla oculta da los mismos datos a los lectores de pantalla.
 */
export function EvolutionChart({
  months,
  currency,
}: {
  months: MonthSummary[];
  currency: Currency;
}) {
  const [active, setActive] = useState<number | null>(null);
  const values = months.flatMap((m) => [toNumber(m.income), toNumber(m.expense)]);
  const max = niceMax(Math.max(...values));
  const ticks = [max, max / 2, 0];

  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 text-sm" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-income" />
          Ingresos
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-chart-expense" />
          Gastos
        </span>
      </div>

      <div className="flex gap-3">
        {/* Eje vertical: tres valores de referencia y un hueco a la altura de los nombres de mes. */}
        <div aria-hidden="true" className="flex flex-col">
          <div className="tabular flex h-64 flex-col justify-between text-right text-xs text-muted">
            {ticks.map((tick) => (
              <span key={tick} className="leading-none">
                {formatCompactMoney(tick, currency)}
              </span>
            ))}
          </div>
          <div className="h-8" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div aria-hidden="true" className="relative h-64">
            {ticks.map((tick, i) => (
              <div
                key={tick}
                className={`absolute inset-x-0 border-t ${
                  i === ticks.length - 1 ? 'border-line' : 'border-dashed border-line'
                }`}
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 grid grid-cols-6">
              {months.map((month, index) => (
                <div
                  key={`${month.year}-${month.month}`}
                  className="relative flex items-end justify-center gap-0.5 px-1.5"
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  {active === index && <div className="absolute inset-0 rounded-lg bg-faint" />}
                  <Bar value={toNumber(month.income)} max={max} color="bg-chart-income" />
                  <Bar value={toNumber(month.expense)} max={max} color="bg-chart-expense" />
                  {active === index && (
                    <Tooltip
                      month={month}
                      currency={currency}
                      align={index >= 3 ? 'right' : 'left'}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Nombres de los meses: enfocables con el teclado para ver el detalle de cada uno. */}
          <div className="grid h-8 grid-cols-6 items-end">
            {months.map((month, index) => (
              <button
                key={`${month.year}-${month.month}`}
                type="button"
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                aria-label={`${periodLabel(month)}: ingresos ${formatMoney(month.income, currency)}, gastos ${formatMoney(month.expense, currency)}, balance ${formatMoney(month.balance, currency)}`}
                className={`rounded-md py-1 text-center text-xs ${
                  active === index ? 'font-semibold text-ink' : 'text-muted'
                }`}
              >
                {periodLabel(month, 'short')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Ingresos, gastos y balance de los últimos 6 meses</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Gastos</th>
            <th scope="col">Balance</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={`${month.year}-${month.month}`}>
              <th scope="row">{periodLabel(month)}</th>
              <td>{formatMoney(month.income, currency)}</td>
              <td>{formatMoney(month.expense, currency)}</td>
              <td>{formatMoney(month.balance, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  if (value <= 0) return <div className="w-full max-w-7" />;
  return (
    <div
      className={`relative w-full max-w-7 rounded-t-[4px] ${color}`}
      style={{ height: `max(${(value / max) * 100}%, 3px)` }}
    />
  );
}

function Tooltip({
  month,
  currency,
  align,
}: {
  month: MonthSummary;
  currency: Currency;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`pointer-events-none absolute top-2 z-10 w-48 rounded-xl border border-line bg-card p-3 text-sm shadow-lg ${
        align === 'right' ? 'right-full mr-1' : 'left-full ml-1'
      }`}
    >
      <p className="mb-2 font-semibold">{periodLabel(month)}</p>
      <dl className="tabular grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-sm bg-chart-income" />
          Ingresos
        </dt>
        <dd className="text-right">{formatMoney(month.income, currency)}</dd>
        <dt className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-sm bg-chart-expense" />
          Gastos
        </dt>
        <dd className="text-right">{formatMoney(month.expense, currency)}</dd>
        <dt className="border-t border-line pt-1 text-muted">Balance</dt>
        <dd className="border-t border-line pt-1 text-right font-semibold">
          {formatMoney(month.balance, currency)}
        </dd>
      </dl>
    </div>
  );
}
