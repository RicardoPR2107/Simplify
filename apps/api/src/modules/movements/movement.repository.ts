import type { ListMovementsQuery, MovementType, MovementView } from '@simplify/shared';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

export interface MovementData {
  type: MovementType;
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  notes: string | null;
}

export interface MovementRepository {
  list(
    userId: string,
    query: ListMovementsQuery,
  ): Promise<{ items: MovementView[]; total: number }>;
  findById(userId: string, id: string): Promise<MovementView | null>;
  create(userId: string, data: MovementData): Promise<MovementView>;
  /** Devuelve `null` si no existe o es de otro usuario. */
  update(userId: string, id: string, data: Partial<MovementData>): Promise<MovementView | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

const SELECT = {
  id: true,
  type: true,
  description: true,
  amount: true,
  date: true,
  notes: true,
  category: { select: { id: true, name: true, type: true } },
} as const;

type MovementRow = Prisma.MovementGetPayload<{ select: typeof SELECT }>;

export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: string, query: ListMovementsQuery) {
    const where: Prisma.MovementWhereInput = {
      userId,
      type: query.type,
      categoryId: query.categoryId,
      date: query.from || query.to ? { gte: toDate(query.from), lte: toDate(query.to) } : undefined,
      description: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    const orderBy: Prisma.MovementOrderByWithRelationInput[] = [
      { [query.sortBy]: query.order },
      // Desempate estable: sin él, dos movimientos con la misma fecha podrían
      // aparecer en páginas distintas al recargar.
      { createdAt: query.order },
      { id: query.order },
    ];

    // Las dos consultas en una transacción: el total y la página ven los mismos datos.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.movement.findMany({
        where,
        orderBy,
        select: SELECT,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.movement.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  async findById(userId: string, id: string) {
    const row = await this.prisma.movement.findFirst({ where: { id, userId }, select: SELECT });
    return row ? toView(row) : null;
  }

  async create(userId: string, data: MovementData) {
    const row = await this.prisma.movement.create({
      data: { ...data, userId, date: toDate(data.date)! },
      select: SELECT,
    });
    return toView(row);
  }

  async update(userId: string, id: string, data: Partial<MovementData>) {
    try {
      const row = await this.prisma.movement.update({
        where: { id, userId },
        data: { ...data, date: toDate(data.date) },
        select: SELECT,
      });
      return toView(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async delete(userId: string, id: string) {
    const { count } = await this.prisma.movement.deleteMany({ where: { id, userId } });
    return count === 1;
  }
}

/** "2026-11-15" → medianoche UTC de ese día (la columna es DATE, sin hora). */
function toDate(value: string | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00Z`) : undefined;
}

function toView(row: MovementRow): MovementView {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    // Decimal → texto con 2 decimales exactos, sin pasar nunca por `number`.
    amount: row.amount.toFixed(2),
    date: row.date.toISOString().slice(0, 10),
    notes: row.notes,
    category: row.category,
  };
}
