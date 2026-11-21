import { ErrorCode, type CategoryView, type MovementType } from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

export interface CategoryRecord {
  id: string;
  name: string;
  type: MovementType;
  isDefault: boolean;
}

/**
 * Todas las operaciones reciben el `userId` y filtran por él (RN-05):
 * un usuario nunca puede leer ni tocar categorías de otro, aunque conozca su id.
 */
export interface CategoryRepository {
  list(userId: string, type?: MovementType): Promise<CategoryView[]>;
  findById(userId: string, id: string): Promise<CategoryRecord | null>;
  /** Busca por nombre sin distinguir mayúsculas ("comida" y "Comida" son la misma). */
  findByName(userId: string, type: MovementType, name: string): Promise<CategoryRecord | null>;
  create(userId: string, data: { name: string; type: MovementType }): Promise<CategoryRecord>;
  rename(userId: string, id: string, name: string): Promise<CategoryRecord>;
  countMovements(userId: string, id: string): Promise<number>;
  /** Pasa los movimientos a `reassignTo` (si se indica) y elimina la categoría, todo o nada. */
  delete(userId: string, id: string, reassignTo?: string): Promise<void>;
}

const FIELDS = { id: true, name: true, type: true, isDefault: true } as const;

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: string, type?: MovementType): Promise<CategoryView[]> {
    const rows = await this.prisma.category.findMany({
      where: { userId, type },
      select: { ...FIELDS, _count: { select: { movements: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return rows.map(({ _count, ...category }) => ({
      ...category,
      movementCount: _count.movements,
    }));
  }

  findById(userId: string, id: string): Promise<CategoryRecord | null> {
    return this.prisma.category.findFirst({ where: { id, userId }, select: FIELDS });
  }

  findByName(userId: string, type: MovementType, name: string): Promise<CategoryRecord | null> {
    return this.prisma.category.findFirst({
      where: { userId, type, name: { equals: name, mode: 'insensitive' } },
      select: FIELDS,
    });
  }

  async create(userId: string, data: { name: string; type: MovementType }) {
    try {
      return await this.prisma.category.create({ data: { ...data, userId }, select: FIELDS });
    } catch (err) {
      throw mapUniqueViolation(err);
    }
  }

  async rename(userId: string, id: string, name: string) {
    try {
      // `where` con userId: si el id es de otro usuario, no se actualiza nada (P2025 → 404).
      return await this.prisma.category.update({
        where: { id, userId },
        data: { name },
        select: FIELDS,
      });
    } catch (err) {
      if (isPrismaError(err, 'P2025')) throw AppError.notFound();
      throw mapUniqueViolation(err);
    }
  }

  countMovements(userId: string, id: string): Promise<number> {
    return this.prisma.movement.count({ where: { userId, categoryId: id } });
  }

  async delete(userId: string, id: string, reassignTo?: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (reassignTo) {
          await tx.movement.updateMany({
            where: { userId, categoryId: id },
            data: { categoryId: reassignTo },
          });
        }
        await tx.category.delete({ where: { id, userId } });
      });
    } catch (err) {
      if (isPrismaError(err, 'P2025')) throw AppError.notFound();
      // P2003: la base de datos impidió borrarla porque aún tiene movimientos (ON DELETE RESTRICT).
      // Pasa si alguien registró un movimiento justo entre la comprobación y el borrado.
      if (isPrismaError(err, 'P2003')) throw new AppError(ErrorCode.CATEGORY_IN_USE);
      throw err;
    }
  }
}

function isPrismaError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

/** Dos peticiones simultáneas con el mismo nombre: el índice único detiene a la segunda. */
function mapUniqueViolation(err: unknown): unknown {
  return isPrismaError(err, 'P2002') ? new AppError(ErrorCode.CATEGORY_ALREADY_EXISTS) : err;
}
