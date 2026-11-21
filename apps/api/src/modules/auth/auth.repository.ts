import { DEFAULT_CATEGORIES, ErrorCode, type Currency } from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

/** Usuario tal como se guarda. Incluye el hash: nunca debe salir de la API. */
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  currency: Currency;
}

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
}

/** Lo único que el usuario puede cambiar de su perfil (lista blanca: nunca el correo ni el hash). */
export interface ProfileChanges {
  name?: string;
  currency?: Currency;
}

/** Capa Repository: única parte del módulo que habla con la base de datos. */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** Cambia nombre o moneda. Devuelve `null` si la cuenta ya no existe. */
  updateProfile(id: string, data: ProfileChanges): Promise<UserRecord | null>;
  /** Crea el usuario y sus categorías predeterminadas en una sola operación atómica. */
  createWithDefaultCategories(data: NewUser): Promise<UserRecord>;
}

const USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  currency: true,
} as const;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email }, select: USER_FIELDS });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_FIELDS });
  }

  async updateProfile(id: string, data: ProfileChanges): Promise<UserRecord | null> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { name: data.name, currency: data.currency },
        select: USER_FIELDS,
      });
    } catch (err) {
      // P2025: no existe el registro (la cuenta se eliminó mientras la sesión seguía viva).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async createWithDefaultCategories(data: NewUser): Promise<UserRecord> {
    try {
      // La creación anidada se ejecuta en una transacción: o se crean el usuario y sus
      // 11 categorías, o no se crea nada (RN-10).
      return await this.prisma.user.create({
        data: {
          ...data,
          categories: {
            createMany: {
              data: DEFAULT_CATEGORIES.map((category) => ({ ...category, isDefault: true })),
            },
          },
        },
        select: USER_FIELDS,
      });
    } catch (err) {
      // Dos registros simultáneos con el mismo correo: el índice único de la base de datos
      // detiene al segundo aunque ambos hayan pasado la comprobación previa del servicio.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(ErrorCode.EMAIL_ALREADY_REGISTERED);
      }
      throw err;
    }
  }
}
