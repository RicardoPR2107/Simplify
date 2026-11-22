import type { Currency, MovementView } from '@simplify/shared';
import { PencilIcon, TrashIcon } from '../../components/ui/icons';
import { formatDate, formatMoney } from '../../lib/format';

interface MovementListProps {
  movements: MovementView[];
  currency: Currency;
  onEdit: (movement: MovementView) => void;
  onDelete: (movement: MovementView) => void;
}

/** Tabla en escritorio y tarjetas en móvil, con los mismos datos y acciones. */
export function MovementList({ movements, currency, onEdit, onDelete }: MovementListProps) {
  return (
    <>
      <table className="hidden w-full border-separate border-spacing-0 overflow-hidden rounded-card border border-line bg-card md:table">
        <caption className="sr-only">Movimientos</caption>
        <thead>
          <tr className="text-left text-sm text-muted">
            <th scope="col" className="px-5 py-3 font-medium">
              Fecha
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Descripción
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Categoría
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Importe
            </th>
            <th scope="col" className="px-5 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id} className="group">
              <td className="tabular whitespace-nowrap border-t border-line px-5 py-4 text-muted">
                {formatDate(movement.date)}
              </td>
              <td className="border-t border-line px-5 py-4">
                <p className="font-medium">{movement.description}</p>
                {movement.notes && (
                  <p className="line-clamp-1 text-sm text-muted">{movement.notes}</p>
                )}
              </td>
              <td className="border-t border-line px-5 py-4">
                <CategoryChip movement={movement} />
              </td>
              <td className="border-t border-line px-5 py-4 text-right">
                <Amount movement={movement} currency={currency} />
              </td>
              <td className="border-t border-line px-3 py-4">
                <Actions movement={movement} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* En móvil cada tarjeta es un botón que abre la edición; eliminar está dentro del formulario. */}
      <ul aria-label="Movimientos" className="flex flex-col gap-3 md:hidden">
        {movements.map((movement) => (
          <li key={movement.id}>
            <button
              type="button"
              onClick={() => onEdit(movement)}
              className="flex w-full flex-col gap-1 rounded-2xl border border-line bg-card p-4 text-left active:bg-faint"
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="truncate font-medium">{movement.description}</span>
                <Amount movement={movement} currency={currency} />
              </span>
              <span className="text-sm text-muted">
                {formatDate(movement.date)} · {movement.category.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function CategoryChip({ movement }: { movement: MovementView }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
        movement.type === 'INCOME' ? 'bg-income-bg text-income' : 'bg-expense-bg text-expense'
      }`}
    >
      {movement.category.name}
    </span>
  );
}

function Amount({ movement, currency }: { movement: MovementView; currency: Currency }) {
  return (
    <span
      className={`tabular whitespace-nowrap font-semibold ${
        movement.type === 'INCOME' ? 'text-income' : 'text-expense'
      }`}
    >
      <span className="sr-only">{movement.type === 'INCOME' ? 'Ingreso de ' : 'Gasto de '}</span>
      {formatMoney(movement.amount, currency, movement.type)}
    </span>
  );
}

function Actions({
  movement,
  onEdit,
  onDelete,
}: {
  movement: MovementView;
  onEdit: (m: MovementView) => void;
  onDelete: (m: MovementView) => void;
}) {
  const button =
    'flex size-10 items-center justify-center rounded-full text-muted hover:bg-faint hover:text-ink';
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(movement)}
        aria-label={`Editar ${movement.description}`}
        title="Editar"
        className={button}
      >
        <PencilIcon width={18} height={18} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(movement)}
        aria-label={`Eliminar ${movement.description}`}
        title="Eliminar"
        className={`${button} hover:text-expense`}
      >
        <TrashIcon width={18} height={18} />
      </button>
    </div>
  );
}
