import { randomUUID } from 'node:crypto';
import type { ListMovementsQuery, MovementView } from '@simplify/shared';
import type {
  MovementData,
  MovementRepository,
} from '../../src/modules/movements/movement.repository.js';
import type { InMemoryCategoryRepository } from './in-memory-category.repository.js';

type Stored = MovementData & { id: string; userId: string; seq: number };

/** Doble de prueba de los movimientos, en memoria. Usa el doble de categorías para los nombres. */
export class InMemoryMovementRepository implements MovementRepository {
  readonly movements: Stored[] = [];
  private seq = 0;

  constructor(private readonly categories: InMemoryCategoryRepository) {}

  async list(userId: string, query: ListMovementsQuery) {
    const q = query.q?.toLowerCase();
    const filtered = this.movements.filter(
      (m) =>
        m.userId === userId &&
        (!query.type || m.type === query.type) &&
        (!query.categoryId || m.categoryId === query.categoryId) &&
        (!query.from || m.date >= query.from) &&
        (!query.to || m.date <= query.to) &&
        (!q || m.description.toLowerCase().includes(q)),
    );
    const direction = query.order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const primary =
        query.sortBy === 'amount'
          ? Number(a.amount) - Number(b.amount)
          : a.date.localeCompare(b.date);
      return (primary || a.seq - b.seq) * direction;
    });
    const start = (query.page - 1) * query.pageSize;
    const page = filtered.slice(start, start + query.pageSize);
    return { items: await Promise.all(page.map((m) => this.toView(m))), total: filtered.length };
  }

  async findById(userId: string, id: string) {
    const movement = this.movements.find((m) => m.userId === userId && m.id === id);
    return movement ? this.toView(movement) : null;
  }

  async create(userId: string, data: MovementData) {
    const movement: Stored = { ...data, id: randomUUID(), userId, seq: this.seq++ };
    this.movements.push(movement);
    return this.toView(movement);
  }

  async update(userId: string, id: string, data: Partial<MovementData>) {
    const movement = this.movements.find((m) => m.userId === userId && m.id === id);
    if (!movement) return null;
    Object.assign(movement, data);
    return this.toView(movement);
  }

  async delete(userId: string, id: string) {
    const index = this.movements.findIndex((m) => m.userId === userId && m.id === id);
    if (index === -1) return false;
    this.movements.splice(index, 1);
    return true;
  }

  private async toView(m: Stored): Promise<MovementView> {
    const category = await this.categories.findById(m.userId, m.categoryId);
    return {
      id: m.id,
      type: m.type,
      description: m.description,
      amount: Number(m.amount).toFixed(2),
      date: m.date,
      notes: m.notes,
      category: { id: m.categoryId, name: category?.name ?? '', type: category?.type ?? m.type },
    };
  }
}
