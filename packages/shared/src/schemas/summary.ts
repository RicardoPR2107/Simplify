import type { z } from 'zod';
import { movementTypeSchema, type MovementType } from './category.js';
import { periodQuerySchema } from './movement.js';

/** Meses que muestra el gráfico de evolución (RF-16). */
export const EVOLUTION_MONTHS = 6;

export const categorySummaryQuerySchema = periodQuerySchema.extend({
  type: movementTypeSchema.default('EXPENSE'),
});
export type CategorySummaryQuery = z.infer<typeof categorySummaryQuerySchema>;

export interface MonthSummary {
  year: number;
  month: number;
  income: string;
  expense: string;
  /** Ingresos − gastos. Puede ser negativo. */
  balance: string;
}

export interface CategorySummary {
  type: MovementType;
  total: string;
  items: Array<{ categoryId: string; name: string; total: string; percentage: number }>;
}

export interface EvolutionSummary {
  months: MonthSummary[];
}
