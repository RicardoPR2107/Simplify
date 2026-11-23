import { z } from 'zod';
import { amountSchema } from '../money.js';
import { movementTypeSchema, type MovementType } from './category.js';

/** RN-08: fecha de calendario válida en formato AAAA-MM-DD (sin hora ni zona horaria). */
export const isoDateSchema = z
  .string({ error: 'La fecha es obligatoria.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Esa fecha no existe.');

export const createMovementSchema = z.object({
  type: movementTypeSchema,
  description: z
    .string({ error: 'La descripción es obligatoria.' })
    .trim()
    .min(2, 'La descripción debe tener al menos 2 caracteres.')
    .max(120, 'La descripción no puede superar los 120 caracteres.'),
  amount: amountSchema,
  categoryId: z.uuid({ error: 'Elige una categoría.' }),
  date: isoDateSchema,
  notes: z.string().trim().max(500, 'Las notas no pueden superar los 500 caracteres.').optional(),
});
export type CreateMovementInput = z.infer<typeof createMovementSchema>;

export const updateMovementSchema = createMovementSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Envía al menos un campo para actualizar.');
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>;

/** Máximo de registros por página para que nadie pueda pedir toda la tabla de una vez. */
export const MAX_PAGE_SIZE = 50;

export const listMovementsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
    type: movementTypeSchema.optional(),
    categoryId: z.uuid().optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    q: z.string().trim().max(60).optional(),
    sortBy: z.enum(['date', 'amount']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'La fecha inicial no puede ser posterior a la final.',
    path: ['from'],
  });
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;

/** Periodo del dashboard: mes (1-12) y año. */
export const periodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

/** Lo que la API devuelve de un movimiento. */
export interface MovementView {
  id: string;
  type: MovementType;
  description: string;
  /** Texto con 2 decimales, por ejemplo "85.50" (docs/adr/0003). */
  amount: string;
  /** AAAA-MM-DD */
  date: string;
  notes: string | null;
  category: { id: string; name: string; type: MovementType };
}

export interface MovementPage {
  items: MovementView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
