import { useQuery } from '@tanstack/react-query';
import type { CategoryView, MovementType } from '@simplify/shared';
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
