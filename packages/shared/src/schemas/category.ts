import { z } from 'zod';

/** RN-02: un movimiento solo puede ser ingreso o gasto. */
export const MOVEMENT_TYPES = ['INCOME', 'EXPENSE'] as const;
export const movementTypeSchema = z.enum(MOVEMENT_TYPES, {
  error: 'El tipo debe ser ingreso o gasto.',
});
export type MovementType = z.infer<typeof movementTypeSchema>;

export const categoryNameSchema = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(40, 'El nombre no puede superar los 40 caracteres.');

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  type: movementTypeSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** El tipo de una categoría no se cambia: cambiaría el sentido de sus movimientos. */
export const updateCategorySchema = z.object({ name: categoryNameSchema });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** RN-09: para eliminar una categoría en uso hay que indicar a cuál pasan sus movimientos. */
export const deleteCategorySchema = z.object({
  reassignTo: z.uuid({ error: 'Categoría de destino no válida.' }).optional(),
});
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

/** Id de un recurso en la URL (`/categories/:id`). Se valida antes de llegar a la base de datos. */
export const idParamSchema = z.object({ id: z.uuid({ error: 'El identificador no es válido.' }) });

export const listCategoriesQuerySchema = z.object({ type: movementTypeSchema.optional() });
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

/** Lo que la API devuelve de una categoría. */
export interface CategoryView {
  id: string;
  name: string;
  type: MovementType;
  isDefault: boolean;
  /** Cuántos movimientos la usan: el frontend lo necesita para avisar antes de eliminarla. */
  movementCount: number;
}

/** Categorías creadas al registrarse (sección 2.3 del documento de producto). */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: MovementType }> = [
  { name: 'Salario', type: 'INCOME' },
  { name: 'Freelance', type: 'INCOME' },
  { name: 'Inversiones', type: 'INCOME' },
  { name: 'Otros ingresos', type: 'INCOME' },
  { name: 'Alimentación', type: 'EXPENSE' },
  { name: 'Transporte', type: 'EXPENSE' },
  { name: 'Vivienda', type: 'EXPENSE' },
  { name: 'Salud', type: 'EXPENSE' },
  { name: 'Educación', type: 'EXPENSE' },
  { name: 'Entretenimiento', type: 'EXPENSE' },
  { name: 'Otros gastos', type: 'EXPENSE' },
];
