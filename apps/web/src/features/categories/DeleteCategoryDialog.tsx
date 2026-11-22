import type { CategoryView } from '@simplify/shared';
import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { FormAlert, SelectField } from '../../components/ui/form';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../auth/forms';
import { byType, useCategories, useDeleteCategory } from './api';

/**
 * RN-09: si la categoría tiene movimientos, hay que elegir a qué categoría del mismo tipo
 * pasan antes de eliminarla. Sin movimientos, basta con confirmar.
 */
export function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: CategoryView;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const remove = useDeleteCategory();
  const toast = useToast();
  const [target, setTarget] = useState('');
  const [targetError, setTargetError] = useState<string>();

  const inUse = category.movementCount > 0;
  const destinations = byType(categories, category.type).filter((c) => c.id !== category.id);
  const count = category.movementCount;
  const movementsLabel = `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`;

  function confirm() {
    if (inUse && !target) {
      setTargetError('Elige a qué categoría pasarán los movimientos.');
      return;
    }
    remove.mutate(
      { id: category.id, reassignTo: inUse ? target : undefined },
      {
        onSuccess: () => {
          toast('Categoría eliminada');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      size="sm"
      title={`¿Eliminar "${category.name}"?`}
      description={
        inUse
          ? `Esta categoría tiene ${movementsLabel}. Elige a qué categoría pasarán antes de eliminarla.`
          : 'No tiene movimientos, así que no se perderá nada.'
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {remove.error && <FormAlert>{describeError(remove.error)}</FormAlert>}
        {inUse &&
          (destinations.length > 0 ? (
            <SelectField
              label="Mover los movimientos a"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setTargetError(undefined);
              }}
              error={targetError}
              data-autofocus
            >
              <option value="">Elige una categoría</option>
              {destinations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <FormAlert>
              Es tu única categoría de {category.type === 'INCOME' ? 'ingresos' : 'gastos'}. Crea
              otra primero para poder mover sus movimientos.
            </FormAlert>
          ))}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            data-autofocus={!inUse || undefined}
            className="h-12 rounded-full border border-line px-6 font-semibold hover:bg-faint"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={remove.isPending || (inUse && destinations.length === 0)}
            className="h-12 rounded-full bg-expense px-6 font-semibold text-white disabled:opacity-50"
          >
            {remove.isPending ? 'Eliminando…' : inUse ? 'Mover y eliminar' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
