import { randomUUID } from 'node:crypto';
import type { CategoryView, MovementType } from '@simplify/shared';
import { AppError } from '../../src/errors/app-error.js';
import type {
  CategoryRecord,
  CategoryRepository,
} from '../../src/modules/categories/category.repository.js';

type StoredCategory = CategoryRecord & { userId: string };

/**
 * Doble de prueba de las categorías, en memoria.
 * `movementCounts` simula cuántos movimientos usa cada categoría.
 */
export class InMemoryCategoryRepository implements CategoryRepository {
  readonly categories: StoredCategory[] = [];
  readonly movementCounts = new Map<string, number>();

  async list(userId: string, type?: MovementType): Promise<CategoryView[]> {
    return this.categories
      .filter((c) => c.userId === userId && (!type || c.type === type))
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
      .map((c) => ({
        ...this.strip(c)!,
        movementCount: this.movementCounts.get(c.id) ?? 0,
      }));
  }

  async findById(userId: string, id: string): Promise<CategoryRecord | null> {
    return this.strip(this.categories.find((c) => c.userId === userId && c.id === id));
  }

  async findByName(userId: string, type: MovementType, name: string) {
    const lower = name.toLowerCase();
    return this.strip(
      this.categories.find(
        (c) => c.userId === userId && c.type === type && c.name.toLowerCase() === lower,
      ),
    );
  }

  async create(userId: string, data: { name: string; type: MovementType }) {
    const category: StoredCategory = { id: randomUUID(), userId, isDefault: false, ...data };
    this.categories.push(category);
    return this.strip(category)!;
  }

  async rename(userId: string, id: string, name: string) {
    const category = this.categories.find((c) => c.userId === userId && c.id === id);
    if (!category) throw AppError.notFound();
    category.name = name;
    return this.strip(category)!;
  }

  async countMovements(_userId: string, id: string): Promise<number> {
    return this.movementCounts.get(id) ?? 0;
  }

  async delete(userId: string, id: string, reassignTo?: string): Promise<void> {
    const index = this.categories.findIndex((c) => c.userId === userId && c.id === id);
    if (index === -1) throw AppError.notFound();
    if (reassignTo) {
      const moved = this.movementCounts.get(id) ?? 0;
      this.movementCounts.set(reassignTo, (this.movementCounts.get(reassignTo) ?? 0) + moved);
    }
    this.movementCounts.delete(id);
    this.categories.splice(index, 1);
  }

  private strip(category: StoredCategory | undefined): CategoryRecord | null {
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      isDefault: category.isDefault,
    };
  }
}
