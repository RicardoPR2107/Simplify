import {
  ErrorCode,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
  type UserProfile,
} from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { PasswordHasher } from '../../lib/password.js';
import type { UserRecord, UserRepository } from './auth.repository.js';
import type { LoginThrottleService } from './login-throttle.service.js';

/** Capa Service: reglas de negocio de las cuentas. No conoce Express ni Prisma. */
export class AuthService {
  /** Hash de una contraseña inventada, para comparar cuando el correo no existe (ver `login`). */
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly throttle: LoginThrottleService,
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

  /**
   * RF-02: comprueba correo y contraseña.
   * Responde igual (y tarda lo mismo) si el correo no existe o si la contraseña es incorrecta,
   * para que nadie pueda averiguar qué correos están registrados.
   */
  async login(input: LoginInput, ip: string): Promise<UserProfile> {
    // Primero el límite: si está bloqueado, ni siquiera se comprueba la contraseña.
    await this.throttle.assertAllowed(input.email, ip);

    const user = await this.users.findByEmail(input.email);
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.hasher.verify(hash, input.password);
    if (!user || !valid) {
      await this.throttle.recordFailure(input.email, ip);
      throw new AppError(ErrorCode.INVALID_CREDENTIALS);
    }
    await this.throttle.recordSuccess(input.email, ip);
    return toProfile(user);
  }

  /** Perfil del usuario autenticado. Si la cuenta ya no existe, la sesión no es válida. */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
    return toProfile(user);
  }

  /**
   * RF-04 y RF-18: cambia el nombre o la moneda.
   * La moneda solo cambia cómo se muestran los importes: no convierte los movimientos existentes.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.users.updateProfile(userId, input);
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
    return toProfile(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('contraseña-inexistente-para-igualar-tiempos');
    return this.dummyHash;
  }
}

/** Quita el hash de la contraseña antes de que el usuario salga de la API. */
export function toProfile(user: UserRecord): UserProfile {
  return { id: user.id, name: user.name, email: user.email, currency: user.currency };
}
