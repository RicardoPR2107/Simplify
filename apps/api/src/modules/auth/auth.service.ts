import { ErrorCode, type RegisterInput, type UserProfile } from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { PasswordHasher } from '../../lib/password.js';
import type { UserRecord, UserRepository } from './auth.repository.js';

/** Capa Service: reglas de negocio de las cuentas. No conoce Express ni Prisma. */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /** RF-01: crea una cuenta con sus categorías predeterminadas. */
  async register(input: RegisterInput): Promise<UserProfile> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AppError(ErrorCode.EMAIL_ALREADY_REGISTERED);

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.createWithDefaultCategories({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return toProfile(user);
  }
}

/** Quita el hash de la contraseña antes de que el usuario salga de la API. */
export function toProfile(user: UserRecord): UserProfile {
  return { id: user.id, name: user.name, email: user.email, currency: user.currency };
}
