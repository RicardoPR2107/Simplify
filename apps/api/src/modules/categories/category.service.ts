import {
  ErrorCode,
  type CategoryView,
  type CreateCategoryInput,
  type MovementType,
} from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { CategoryRecord, CategoryRepository } from './category.repository.js';

/** Reglas de negocio de las categorías. */
export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  list(userId: string, type?: MovementType): Promise<CategoryView[]> {
    return this.categories.list(userId, type);
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryView> {
    await this.assertNameAvailable(userId, input.type, input.name);
    const category = await this.categories.create(userId, input);
    return { ...category, movementCount: 0 };
  }

  /** Solo se cambia el nombre: cambiar el tipo alteraría el sentido de sus movimientos. */
  async rename(userId: string, id: string, name: string): Promise<CategoryView> {
    const current = await this.findOwned(userId, id);
    if (current.name !== name) await this.assertNameAvailable(userId, current.type, name, id);
    const category = await this.categories.rename(userId, id, name);
    return { ...category, movementCount: await this.categories.countMovements(userId, id) };
  }

  /**
   * RN-09: una categoría con movimientos no se elimina sin indicar a cuál pasan.
   * El destino debe ser otra categoría del mismo usuario y del mismo tipo.
   */
  async delete(userId: string, id: string, reassignTo?: string): Promise<void> {
    const category = await this.findOwned(userId, id);
    const inUse = (await this.categories.countMovements(userId, id)) > 0;

    if (inUse && !reassignTo) throw new AppError(ErrorCode.CATEGORY_IN_USE);
    if (reassignTo) {
      if (reassignTo === id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, {
          fields: { reassignTo: ['Elige una categoría distinta a la que vas a eliminar.'] },
        });
      }
      const target = await this.categories.findById(userId, reassignTo);
      if (!target) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, {
          fields: { reassignTo: ['La categoría de destino no existe.'] },
        });
      }
      if (target.type !== category.type) throw new AppError(ErrorCode.CATEGORY_TYPE_MISMATCH);
    }

    await this.categories.delete(userId, id, inUse ? reassignTo : undefined);
  }

  /** Una categoría de otro usuario responde 404, igual que una inexistente: no revela que existe. */
  private async findOwned(userId: string, id: string): Promise<CategoryRecord> {
    const category = await this.categories.findById(userId, id);
    if (!category) throw AppError.notFound();
    return category;
  }

  private async assertNameAvailable(
    userId: string,
    type: MovementType,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.categories.findByName(userId, type, name);
    if (existing && existing.id !== exceptId) {
      throw new AppError(ErrorCode.CATEGORY_ALREADY_EXISTS);
    }
  }
}
