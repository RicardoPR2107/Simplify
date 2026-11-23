import type { Currency, MovementView } from '@simplify/shared';
import { formatDate, formatMoney } from '../../lib/format';

/** Los últimos movimientos registrados, para ver de un vistazo la actividad reciente. */
export function RecentMovements({
  movements,
  currency,
}: {
  movements: MovementView[];
  currency: Currency;
}) {
  return (
    <ul aria-label="Últimos movimientos" className="flex flex-col">
      {movements.map((movement) => (
        <li
          key={movement.id}
          className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${
              movement.type === 'INCOME' ? 'bg-chart-income' : 'bg-chart-expense'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{movement.description}</p>
            <p className="text-sm text-muted">
              {formatDate(movement.date)} · {movement.category.name}
            </p>
          </div>
          <span className="tabular whitespace-nowrap font-semibold">
            <span className="sr-only">
              {movement.type === 'INCOME' ? 'Ingreso de ' : 'Gasto de '}
            </span>
            {formatMoney(movement.amount, currency, movement.type)}
          </span>
        </li>
      ))}
    </ul>
  );
}
