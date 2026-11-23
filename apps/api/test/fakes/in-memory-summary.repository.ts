import { fromCents, toCents, type MovementType } from '@simplify/shared';
import type {
  CategoryTotal,
  DateRange,
  MonthlyTotal,
  SummaryRepository,
} from '../../src/modules/summary/summary.repository.js';
import type { InMemoryCategoryRepository } from './in-memory-category.repository.js';
import type { InMemoryMovementRepository } from './in-memory-movement.repository.js';

/** Doble de prueba: calcula los resúmenes a partir de los movimientos en memoria. */
export class InMemorySummaryRepository implements SummaryRepository {
  constructor(
    private readonly movements: InMemoryMovementRepository,
    private readonly categories: InMemoryCategoryRepository,
  ) {}

  async totalsByType(userId: string, range: DateRange) {
    const totals: Record<MovementType, bigint> = { INCOME: 0n, EXPENSE: 0n };
    for (const m of this.inRange(userId, range)) totals[m.type] += toCents(m.amount);
    return { INCOME: fromCents(totals.INCOME), EXPENSE: fromCents(totals.EXPENSE) };
  }

  async totalsByCategory(userId: string, type: MovementType, range: DateRange) {
    const byCategory = new Map<string, bigint>();
    for (const m of this.inRange(userId, range).filter((m) => m.type === type)) {
      byCategory.set(m.categoryId, (byCategory.get(m.categoryId) ?? 0n) + toCents(m.amount));
    }
    const rows: CategoryTotal[] = [];
    for (const [categoryId, cents] of byCategory) {
      const category = await this.categories.findById(userId, categoryId);
      rows.push({ categoryId, name: category?.name ?? '', total: fromCents(cents) });
    }
    return rows.sort((a, b) => Number(toCents(b.total) - toCents(a.total)));
  }

  async monthlyTotals(userId: string, range: DateRange) {
    const totals = new Map<string, bigint>();
    for (const m of this.inRange(userId, range)) {
      const key = `${m.date.slice(0, 7)}|${m.type}`;
      totals.set(key, (totals.get(key) ?? 0n) + toCents(m.amount));
    }
    return [...totals].map(([key, cents]): MonthlyTotal => {
      const [month, type] = key.split('|') as [string, MovementType];
      return { month, type, total: fromCents(cents) };
    });
  }

  private inRange(userId: string, range: DateRange) {
    return this.movements.movements.filter(
      (m) => m.userId === userId && m.date >= range.from && m.date < range.to,
    );
  }
}
