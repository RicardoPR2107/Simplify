import { fromCents, toCents, type CategorySummary, type Currency } from '@simplify/shared';
import { Link } from 'react-router';
import { formatMoney } from '../../lib/format';

/** Cuántas categorías se muestran; el resto se agrupa en "Otras" para no saturar. */
const MAX_ROWS = 6;

/**
 * En qué se va el dinero del mes: barras horizontales ordenadas de mayor a menor.
 * Un solo color (todas son gastos); el nombre, el importe y el porcentaje van escritos en cada fila,
 * así que la información no depende del color ni del tamaño de la barra.
 */
export function ExpensesByCategory({
  summary,
  currency,
  monthQuery,
}: {
  summary: CategorySummary;
  currency: Currency;
  /** Filtro del historial para el mes mostrado, por ejemplo "from=2026-11-01&to=2026-11-30". */
  monthQuery: string;
}) {
  // Agrupar una sola categoría en "Otras" no ahorra espacio: solo se agrupa a partir de dos.
  const fits = summary.items.length <= MAX_ROWS + 1;
  const rows = fits ? [...summary.items] : summary.items.slice(0, MAX_ROWS);
  const rest = fits ? [] : summary.items.slice(MAX_ROWS);
  if (rest.length > 0) {
    const percentage = Math.round(rest.reduce((sum, item) => sum + item.percentage, 0) * 10) / 10;
    const total = rest.reduce((sum, item) => sum + toCents(item.total), 0n);
    rows.push({
      categoryId: '',
      name: `Otras (${rest.length})`,
      total: fromCents(total),
      percentage,
    });
  }
  const max = Math.max(...rows.map((row) => row.percentage), 1);

  return (
    <ul aria-label="Gastos por categoría" className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.categoryId || 'otras'} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {row.categoryId ? (
              <Link
                to={`/historial?type=EXPENSE&categoryId=${row.categoryId}&${monthQuery}`}
                className="truncate font-medium underline-offset-4 hover:underline"
              >
                {row.name}
              </Link>
            ) : (
              <span className="truncate font-medium">{row.name}</span>
            )}
            <span className="tabular shrink-0">
              {formatMoney(row.total, currency)}
              <span className="ml-2 inline-block w-12 text-right text-muted">
                {row.percentage}%
              </span>
            </span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-faint">
            <div
              className="h-full rounded-full bg-chart-expense"
              style={{ width: `${(row.percentage / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
