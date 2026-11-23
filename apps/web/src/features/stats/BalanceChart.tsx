import { toCents, type Currency, type MonthSummary } from '@simplify/shared';
import { formatCompactMoney, formatMoney } from '../../lib/format';
import { periodLabel } from '../dashboard/period';

/**
 * Balance de cada mes alrededor de una línea de cero: hacia arriba si sobró dinero,
 * hacia abajo si se gastó más de lo que entró. El importe va escrito junto a cada barra,
 * así que el signo no depende solo del color. El detalle completo está en la tabla de la página.
 */
export function BalanceChart({ months, currency }: { months: MonthSummary[]; currency: Currency }) {
  const values = months.map((m) => Number(toCents(m.balance)) / 100);
  const maxUp = Math.max(0, ...values);
  const maxDown = Math.max(0, ...values.map((v) => -v));
  const range = maxUp + maxDown || 1;
  // La línea de cero se coloca según cuánto espacio necesita cada lado.
  const zero = (maxUp / range) * 100;

  return (
    <figure aria-label="Balance de los últimos 6 meses" className="flex flex-col gap-2">
      {/* Margen arriba y abajo del área de barras: ahí caben las etiquetas de los valores extremos. */}
      <div aria-hidden="true" className="relative h-64">
        <div className="absolute inset-x-0 inset-y-6">
          <div className="absolute inset-x-0 border-t border-line" style={{ top: `${zero}%` }} />
          <div className="absolute inset-0 grid grid-cols-6 gap-2">
            {months.map((month, i) => {
              const value = values[i]!;
              const positive = value >= 0;
              const height = (Math.abs(value) / range) * 100;
              return (
                <div key={`${month.year}-${month.month}`} className="relative">
                  {value !== 0 && (
                    <div
                      className={`absolute inset-x-1 mx-auto max-w-10 ${
                        positive
                          ? 'rounded-t-[4px] bg-chart-income'
                          : 'rounded-b-[4px] bg-chart-expense'
                      }`}
                      style={
                        positive
                          ? { bottom: `${100 - zero}%`, height: `max(${height}%, 3px)` }
                          : { top: `${zero}%`, height: `max(${height}%, 3px)` }
                      }
                    />
                  )}
                  <span
                    className="tabular absolute inset-x-0 whitespace-nowrap text-center text-[11px] font-medium text-muted"
                    style={
                      positive
                        ? { bottom: `calc(${100 - zero + height}% + 4px)` }
                        : { top: `calc(${zero + height}% + 4px)` }
                    }
                  >
                    {/* Etiqueta abreviada (las cifras exactas están en la tabla de detalle). */}
                    {formatCompactMoney(value, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-6 gap-2 text-center text-xs text-muted">
        {months.map((month) => (
          <span key={`${month.year}-${month.month}`}>{periodLabel(month, 'short')}</span>
        ))}
      </div>
      <figcaption className="sr-only">
        {months.map((m) => `${periodLabel(m)}: ${formatMoney(m.balance, currency)}`).join('. ')}
      </figcaption>
    </figure>
  );
}
