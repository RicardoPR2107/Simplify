import {
  createCategorySchema,
  updateCategorySchema,
  type CategoryView,
  type MovementType,
} from '@simplify/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { FormAlert, Segmented, SubmitButton, TextField } from '../../components/ui/form';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { describeError, firstErrors, validateForm, type FieldErrors } from '../auth/forms';
import { useCreateCategory, useRenameCategory } from './api';

const TYPE_OPTIONS: Array<{ value: MovementType; label: string }> = [
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'INCOME', label: 'Ingreso' },
];

interface CategoryFormProps {
  /** Si se pasa, se renombra esa categoría; si no, se crea una nueva. */
  category?: CategoryView;
  defaultType?: MovementType;
  onClose: () => void;
}

/** RF-10: crear una categoría o cambiarle el nombre (el tipo no se puede cambiar). */
export function CategoryForm({ category, defaultType = 'EXPENSE', onClose }: CategoryFormProps) {
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const mutation = category ? rename : create;
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<MovementType>(category?.type ?? defaultType);
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name');
    const result = category
      ? validateForm(updateCategorySchema, { name })
      : validateForm(createCategorySchema, { name, type });
    if (result.errors) {
      setErrors(result.errors);
      inputRef.current?.focus();
      return;
    }
    setErrors({});
    const done = {
      onSuccess: () => {
        toast(category ? 'Categoría actualizada' : 'Categoría creada');
        onClose();
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.code === 'CATEGORY_ALREADY_EXISTS') {
          setErrors({ name: error.message });
          inputRef.current?.focus();
        } else if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          setErrors(firstErrors(error.fields));
        }
      },
    };
    if (category) rename.mutate({ id: category.id, name: result.data.name }, done);
    else create.mutate({ name: result.data.name, type }, done);
  }

  const handledInline =
    mutation.error instanceof ApiError &&
    (mutation.error.code === 'CATEGORY_ALREADY_EXISTS' ||
      Object.keys(mutation.error.fields).length > 0);

  return (
    <Dialog
      size="sm"
      title={category ? 'Renombrar categoría' : 'Nueva categoría'}
      description={
        category
          ? `Los movimientos de "${category.name}" mantendrán su categoría con el nombre nuevo.`
          : 'Úsala para agrupar tus ingresos o gastos como prefieras.'
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {mutation.error && !handledInline && <FormAlert>{describeError(mutation.error)}</FormAlert>}
        {!category && (
          <Segmented
            legend="Tipo"
            name="type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={setType}
          />
        )}
        <TextField
          ref={inputRef}
          label="Nombre"
          name="name"
          maxLength={40}
          autoComplete="off"
          placeholder={type === 'EXPENSE' ? 'Ej. Mascotas' : 'Ej. Ventas'}
          defaultValue={category?.name}
          error={errors.name}
          data-autofocus
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-full border border-line px-6 font-semibold hover:bg-faint"
          >
            Cancelar
          </button>
          <SubmitButton pending={mutation.isPending} pendingLabel="Guardando…">
            {category ? 'Guardar' : 'Crear categoría'}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
