import type { Currency, MovementView } from '@simplify/shared';
import { Dialog } from '../../components/ui/Dialog';
import { FormAlert } from '../../components/ui/form';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatMoney } from '../../lib/format';
import { describeError } from '../auth/forms';
import { useDeleteMovement } from './api';

/** RF-09: confirmación antes de eliminar (la acción no se puede deshacer). */
export function DeleteMovementDialog({
  movement,
  currency,
  onClose,
}: {
  movement: MovementView;
  currency: Currency;
  onClose: () => void;
}) {
  const remove = useDeleteMovement();
  const toast = useToast();

  return (
    <Dialog
      size="sm"
      title="¿Eliminar este movimiento?"
      description="Esta acción no se puede deshacer."
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {remove.error && <FormAlert>{describeError(remove.error)}</FormAlert>}
        <div className="rounded-2xl bg-faint p-4">
          <p className="font-medium">{movement.description}</p>
          <p className="tabular text-sm text-muted">
            {formatMoney(movement.amount, currency, movement.type)} · {formatDate(movement.date)} ·{' '}
            {movement.category.name}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="h-12 rounded-full border border-line px-6 font-semibold hover:bg-faint"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(movement.id, {
                onSuccess: () => {
                  toast('Movimiento eliminado');
                  onClose();
                },
              })
            }
            className="h-12 rounded-full bg-danger px-6 font-semibold text-white hover:bg-danger-hover disabled:opacity-70"
          >
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
