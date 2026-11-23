import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMovementInput,
  MovementPage,
  MovementType,
  MovementView,
  UpdateMovementInput,
} from '@simplify/shared';
import { api } from '../../lib/api';
import { categoriesKey } from '../categories/api';

export interface MovementFilters {
  page: number;
  type?: MovementType;
  categoryId?: string;
  from?: string;
  to?: string;
  q?: string;
  sortBy: 'date' | 'amount';
  order: 'asc' | 'desc';
}

export const PAGE_SIZE = 10;
export const movementsKey = ['movements'] as const;

function toQueryString(filters: MovementFilters): string {
  const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

/** Historial paginado. Mientras llega la página nueva se sigue viendo la anterior (sin parpadeos). */
export function useMovements(filters: MovementFilters) {
  return useQuery({
    queryKey: [...movementsKey, filters],
    queryFn: () => api.get<MovementPage>(`/movements?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
  });
}

/**
 * Tras crear, editar o borrar, todo lo que depende de los movimientos queda desactualizado:
 * el historial, los resúmenes del dashboard y el contador de uso de cada categoría.
 */
function useInvalidateMovementData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: movementsKey }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      queryClient.invalidateQueries({ queryKey: categoriesKey }),
    ]);
}

export function useCreateMovement() {
  const invalidate = useInvalidateMovementData();
  return useMutation({
    mutationFn: (input: CreateMovementInput) =>
      api.post<{ movement: MovementView }>('/movements', input),
    onSuccess: invalidate,
  });
}

export function useUpdateMovement() {
  const invalidate = useInvalidateMovementData();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMovementInput }) =>
      api.patch<{ movement: MovementView }>(`/movements/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteMovement() {
  const invalidate = useInvalidateMovementData();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/movements/${id}`),
    onSuccess: invalidate,
  });
}
