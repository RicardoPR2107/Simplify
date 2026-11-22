import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryView, CreateCategoryInput, MovementType } from '@simplify/shared';
import { api } from '../../lib/api';

export const categoriesKey = ['categories'] as const;

/** Todas las categorías del usuario. Se filtran por tipo en el cliente: son pocas. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: async () => (await api.get<{ categories: CategoryView[] }>('/categories')).categories,
  });
}

export function byType(categories: CategoryView[] | undefined, type?: MovementType) {
  return (categories ?? []).filter((c) => !type || c.type === type);
}

/**
 * Renombrar o eliminar una categoría cambia lo que muestran el historial (nombre de la categoría)
 * y los resúmenes (agrupación por categoría): se refresca todo lo que depende de ella.
 */
function useInvalidateCategoryData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: categoriesKey }),
      queryClient.invalidateQueries({ queryKey: ['movements'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
    ]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategoryData();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      api.post<{ category: CategoryView }>('/categories', input),
    onSuccess: invalidate,
  });
}

export function useRenameCategory() {
  const invalidate = useInvalidateCategoryData();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<{ category: CategoryView }>(`/categories/${id}`, { name }),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategoryData();
  return useMutation({
    mutationFn: ({ id, reassignTo }: { id: string; reassignTo?: string }) =>
      api.delete(`/categories/${id}${reassignTo ? `?reassignTo=${reassignTo}` : ''}`),
    onSuccess: invalidate,
  });
}
