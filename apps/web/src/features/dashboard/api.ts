import { useQuery } from '@tanstack/react-query';
import type { CategorySummary, EvolutionSummary, MonthSummary } from '@simplify/shared';
import { api } from '../../lib/api';

export const summaryKey = ['summary'] as const;

export function useMonthSummary(year: number, month: number) {
  return useQuery({
    queryKey: [...summaryKey, 'month', year, month],
    queryFn: () => api.get<MonthSummary>(`/summary/month?year=${year}&month=${month}`),
  });
}

export function useExpensesByCategory(year: number, month: number) {
  return useQuery({
    queryKey: [...summaryKey, 'categories', year, month],
    queryFn: () =>
      api.get<CategorySummary>(`/summary/categories?year=${year}&month=${month}&type=EXPENSE`),
  });
}

export function useEvolution(year: number, month: number) {
  return useQuery({
    queryKey: [...summaryKey, 'evolution', year, month],
    queryFn: () => api.get<EvolutionSummary>(`/summary/evolution?year=${year}&month=${month}`),
  });
}
