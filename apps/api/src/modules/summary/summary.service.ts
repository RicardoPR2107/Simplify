import {
  EVOLUTION_MONTHS,
  fromCents,
  percentage,
  toCents,
  type CategorySummary,
  type EvolutionSummary,
  type MonthSummary,
  type MovementType,
} from '@simplify/shared';
import type { DateRange, SummaryRepository } from './summary.repository.js';

/** Indicadores del dashboard. Toda la aritmética de dinero es en céntimos (`bigint`). */
export class SummaryService {
  constructor(private readonly summaries: SummaryRepository) {}

  /** RF-14, RF-15, RF-17: ingresos, gastos y balance de un mes. */
  async month(userId: string, year: number, month: number): Promise<MonthSummary> {
    const totals = await this.summaries.totalsByType(userId, monthRange(year, month, 1));
    return buildMonth(year, month, toCents(totals.INCOME), toCents(totals.EXPENSE));
  }

  /** Total por categoría del mes, de mayor a menor, con su porcentaje sobre el total. */
  async byCategory(
    userId: string,
    year: number,
    month: number,
    type: MovementType,
  ): Promise<CategorySummary> {
    const rows = await this.summaries.totalsByCategory(userId, type, monthRange(year, month, 1));
    const total = rows.reduce((sum, row) => sum + toCents(row.total), 0n);
    return {
      type,
      total: fromCents(total),
      items: rows.map((row) => ({
        categoryId: row.categoryId,
        name: row.name,
        total: fromCents(toCents(row.total)),
        percentage: percentage(toCents(row.total), total),
      })),
    };
  }

  /** RF-16: los últimos 6 meses terminando en el indicado, incluidos los meses sin movimientos. */
  async evolution(userId: string, year: number, month: number): Promise<EvolutionSummary> {
    const start = addMonths(year, month, -(EVOLUTION_MONTHS - 1));
    const rows = await this.summaries.monthlyTotals(
      userId,
      monthRange(start.year, start.month, EVOLUTION_MONTHS),
    );

    const months: MonthSummary[] = [];
    for (let i = 0; i < EVOLUTION_MONTHS; i++) {
      const { year: y, month: m } = addMonths(start.year, start.month, i);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const sum = (type: MovementType) =>
        toCents(rows.find((r) => r.month === key && r.type === type)?.total ?? '0');
      months.push(buildMonth(y, m, sum('INCOME'), sum('EXPENSE')));
    }
    return { months };
  }
}

function buildMonth(year: number, month: number, income: bigint, expense: bigint): MonthSummary {
  return {
    year,
    month,
    income: fromCents(income),
    expense: fromCents(expense),
    balance: fromCents(income - expense),
  };
}

/** Suma meses cruzando años: (2026, 2) − 3 → (2025, 11). */
export function addMonths(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Del día 1 del mes indicado al día 1 del mes siguiente al periodo (sin incluirlo). */
export function monthRange(year: number, month: number, months: number): DateRange {
  const end = addMonths(year, month, months);
  return { from: firstDay(year, month), to: firstDay(end.year, end.month) };
}

function firstDay(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
