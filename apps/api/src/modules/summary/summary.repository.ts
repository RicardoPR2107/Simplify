import type { MovementType } from '@simplify/shared';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Un periodo [desde, hasta) en fechas AAAA-MM-DD; `to` no se incluye. */
export interface DateRange {
  from: string;
  to: string;
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  total: string;
}

export interface MonthlyTotal {
  /** AAAA-MM */
  month: string;
  type: MovementType;
  total: string;
}

/**
 * Las sumas se hacen en PostgreSQL (con NUMERIC exacto) y llegan como texto:
 * nunca pasan por `number`. Todas las consultas filtran por usuario.
 */
export interface SummaryRepository {
  totalsByType(userId: string, range: DateRange): Promise<Record<MovementType, string>>;
  totalsByCategory(userId: string, type: MovementType, range: DateRange): Promise<CategoryTotal[]>;
  monthlyTotals(userId: string, range: DateRange): Promise<MonthlyTotal[]>;
}

export class PrismaSummaryRepository implements SummaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async totalsByType(userId: string, range: DateRange) {
    const rows = await this.prisma.$queryRaw<Array<{ type: MovementType; total: string }>>`
      SELECT type, SUM(amount)::text AS total
      FROM movements
      WHERE user_id = ${userId}::uuid AND date >= ${range.from}::date AND date < ${range.to}::date
      GROUP BY type`;
    const totals: Record<MovementType, string> = { INCOME: '0', EXPENSE: '0' };
    for (const row of rows) totals[row.type] = row.total;
    return totals;
  }

  totalsByCategory(userId: string, type: MovementType, range: DateRange) {
    return this.prisma.$queryRaw<CategoryTotal[]>`
      SELECT c.id AS "categoryId", c.name, SUM(m.amount)::text AS total
      FROM movements m
      JOIN categories c ON c.id = m.category_id
      WHERE m.user_id = ${userId}::uuid
        AND m.type = ${type}::"MovementType"
        AND m.date >= ${range.from}::date AND m.date < ${range.to}::date
      GROUP BY c.id, c.name
      ORDER BY SUM(m.amount) DESC, c.name ASC`;
  }

  monthlyTotals(userId: string, range: DateRange) {
    return this.prisma.$queryRaw<MonthlyTotal[]>`
      SELECT to_char(date, 'YYYY-MM') AS month, type, SUM(amount)::text AS total
      FROM movements
      WHERE user_id = ${userId}::uuid AND date >= ${range.from}::date AND date < ${range.to}::date
      GROUP BY 1, 2`;
  }
}
