import {
  ErrorCode,
  type CreateMovementInput,
  type ListMovementsQuery,
  type MovementPage,
  type MovementType,
  type MovementView,
  type UpdateMovementInput,
} from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { CategoryRepository } from '../categories/category.repository.js';
import type { MovementData, MovementRepository } from './movement.repository.js';

/** Reglas de negocio de los movimientos (ingresos y gastos). */
export class MovementService {
  constructor(
    private readonly movements: MovementRepository,
    private readonly categories: CategoryRepository,
  ) {}

  /** RF-07, RF-11, RF-12, RF-13: historial filtrado, ordenado y paginado. */
  async list(userId: string, query: ListMovementsQuery): Promise<MovementPage> {
    const { items, total } = await this.movements.list(userId, query);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async get(userId: string, id: string): Promise<MovementView> {
    const movement = await this.movements.findById(userId, id);
    if (!movement) throw AppError.notFound();
    return movement;
  }

  /** RF-05, RF-06 */
  async create(userId: string, input: CreateMovementInput): Promise<MovementView> {
    await this.assertCategoryFits(userId, input.categoryId, input.type);
    return this.movements.create(userId, { ...input, notes: emptyToNull(input.notes) });
  }

  /**
   * RF-08: edición parcial. Se comprueba la combinación final de tipo y categoría:
   * cambiar solo el tipo a "ingreso" sin cambiar una categoría de gasto se rechaza.
   */
  async update(userId: string, id: string, input: UpdateMovementInput): Promise<MovementView> {
    const current = await this.get(userId, id);
    const type = input.type ?? current.type;
    const categoryId = input.categoryId ?? current.category.id;
    if (input.type !== undefined || input.categoryId !== undefined) {
      await this.assertCategoryFits(userId, categoryId, type);
    }

    const changes: Partial<MovementData> = { ...input };
    if (input.notes !== undefined) changes.notes = emptyToNull(input.notes);
    const updated = await this.movements.update(userId, id, changes);
    if (!updated) throw AppError.notFound();
    return updated;
  }

  /** RF-09 */
  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.movements.delete(userId, id))) throw AppError.notFound();
  }

  /** RN-03 y RN-05: la categoría debe ser del usuario y del mismo tipo que el movimiento. */
  private async assertCategoryFits(
    userId: string,
    categoryId: string,
    type: MovementType,
  ): Promise<void> {
    const category = await this.categories.findById(userId, categoryId);
    if (!category) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, {
        fields: { categoryId: ['La categoría elegida no existe.'] },
      });
    }
    if (category.type !== type) throw new AppError(ErrorCode.CATEGORY_TYPE_MISMATCH);
  }
}

/** Unas notas vacías se guardan como "sin notas". */
function emptyToNull(notes: string | undefined): string | null {
  return notes ? notes : null;
}
