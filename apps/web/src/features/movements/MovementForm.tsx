import {
  createMovementSchema,
  type CreateMovementInput,
  type MovementType,
  type MovementView,
} from '@simplify/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import {
  FormAlert,
  Segmented,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from '../../components/ui/form';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { normalizeAmountInput, todayISO } from '../../lib/format';
import {
  describeError,
  firstErrors,
  focusFirstError,
  validateForm,
  type FieldErrors,
} from '../auth/forms';
import { byType, useCategories } from '../categories/api';
import { useCreateMovement, useUpdateMovement } from './api';

interface MovementFormProps {
  /** Si se pasa, el formulario edita ese movimiento; si no, crea uno nuevo. */
  movement?: MovementView;
  onClose: () => void;
  /** Al editar: abre la confirmación para eliminar el movimiento. */
  onDelete?: (movement: MovementView) => void;
}

const TYPE_OPTIONS: Array<{ value: MovementType; label: string }> = [
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'INCOME', label: 'Ingreso' },
];

/** RF-05, RF-06 y RF-08: registrar o editar un ingreso o un gasto. */
export function MovementForm({ movement, onClose, onDelete }: MovementFormProps) {
  const editing = Boolean(movement);
  const { data: categories, isPending: loadingCategories } = useCategories();
  const create = useCreateMovement();
  const update = useUpdateMovement();
  const mutation = editing ? update : create;
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<MovementType>(movement?.type ?? 'EXPENSE');
  const [categoryId, setCategoryId] = useState(movement?.category.id ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const options = byType(categories, type);

  function changeType(next: MovementType) {
    setType(next);
    // La categoría elegida era del otro tipo: hay que elegir una nueva (RN-03).
    setCategoryId('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      type,
      categoryId,
      amount: normalizeAmountInput(String(form.get('amount') ?? '')),
      description: form.get('description'),
      date: form.get('date'),
      notes: form.get('notes') || undefined,
    };
    const result = validateForm(createMovementSchema, values);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(formRef.current, result.errors);
      return;
    }
    setErrors({});
    const input: CreateMovementInput = { ...result.data, notes: result.data.notes ?? '' };
    const done = {
      onSuccess: () => {
        toast(editing ? 'Movimiento actualizado' : 'Movimiento registrado');
        onClose();
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          setErrors(firstErrors(error.fields));
        } else if (error instanceof ApiError && error.code === 'CATEGORY_TYPE_MISMATCH') {
          setErrors({ categoryId: error.message });
        }
      },
    };
    if (movement) update.mutate({ id: movement.id, input }, done);
    else create.mutate(input, done);
  }

  const showGeneralError =
    mutation.error &&
    !(
      mutation.error instanceof ApiError &&
      (Object.keys(mutation.error.fields).length > 0 ||
        mutation.error.code === 'CATEGORY_TYPE_MISMATCH')
    );

  return (
    <Dialog
      title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
      description={editing ? undefined : 'Registra un ingreso o un gasto.'}
      onClose={onClose}
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {showGeneralError && <FormAlert>{describeError(mutation.error)}</FormAlert>}
        <Segmented
          legend="Tipo"
          name="type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={changeType}
        />
        <TextField
          label="Importe"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          defaultValue={movement?.amount}
          error={errors.amount}
          className="tabular"
          data-autofocus
        />
        <TextField
          label="Descripción"
          name="description"
          placeholder={type === 'EXPENSE' ? 'Ej. Supermercado' : 'Ej. Sueldo de noviembre'}
          maxLength={120}
          defaultValue={movement?.description}
          error={errors.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Categoría"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            error={errors.categoryId}
            disabled={loadingCategories}
          >
            <option value="">{loadingCategories ? 'Cargando…' : 'Elige una categoría'}</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Fecha"
            name="date"
            type="date"
            defaultValue={movement?.date ?? todayISO()}
            error={errors.date}
          />
        </div>
        <TextAreaField
          label="Notas (opcional)"
          name="notes"
          maxLength={500}
          defaultValue={movement?.notes ?? ''}
          error={errors.notes}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {movement && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(movement)}
              className="h-12 rounded-full px-4 font-semibold text-expense hover:bg-expense-bg sm:mr-auto"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-full border border-line px-6 font-semibold hover:bg-faint"
          >
            Cancelar
          </button>
          <SubmitButton pending={mutation.isPending} pendingLabel="Guardando…">
            {editing ? 'Guardar cambios' : 'Registrar'}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
