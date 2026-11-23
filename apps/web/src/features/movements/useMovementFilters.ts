import { movementTypeSchema } from '@simplify/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { MovementFilters } from './api';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Los filtros viven en la URL (?type=EXPENSE&page=2…): se pueden compartir o guardar,
 * y el botón "atrás" del navegador vuelve al filtro anterior.
 * Valores inválidos escritos a mano en la URL se ignoran en vez de romper la pantalla.
 */
export function useMovementFilters() {
  const [params, setParams] = useSearchParams();

  const type = movementTypeSchema.safeParse(params.get('type'));
  const page = Number(params.get('page'));
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sort = params.get('sort');

  const filters: MovementFilters = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    type: type.success ? type.data : undefined,
    categoryId: params.get('categoryId') || undefined,
    from: DATE.test(from) ? from : undefined,
    to: DATE.test(to) ? to : undefined,
    q: params.get('q')?.trim() || undefined,
    sortBy: sort?.startsWith('amount') ? 'amount' : 'date',
    order: sort?.endsWith('asc') ? 'asc' : 'desc',
  };

  /** Cambia uno o varios filtros. Cualquier cambio que no sea de página vuelve a la página 1. */
  const update = useCallback(
    (changes: Record<string, string | undefined>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: !('page' in changes) },
      ),
    [setParams],
  );

  function clear() {
    setParams(new URLSearchParams());
  }

  const active = Boolean(
    filters.type || filters.categoryId || filters.from || filters.to || filters.q,
  );
  const sortValue = `${filters.sortBy}-${filters.order}`;

  return { filters, update, clear, active, sortValue, params, setParams };
}
