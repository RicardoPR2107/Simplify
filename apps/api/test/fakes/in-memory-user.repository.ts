import { randomUUID } from 'node:crypto';
import { ErrorCode } from '@simplify/shared';
import { AppError } from '../../src/errors/app-error.js';
import type {
  NewUser,
  UserRecord,
  UserRepository,
} from '../../src/modules/auth/auth.repository.js';

/** Doble de prueba: guarda los usuarios en memoria. Permite probar el servicio sin base de datos. */
export class InMemoryUserRepository implements UserRepository {
  readonly users: UserRecord[] = [];

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createWithDefaultCategories(data: NewUser): Promise<UserRecord> {
    if (this.users.some((user) => user.email === data.email)) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_REGISTERED);
    }
    const user: UserRecord = { id: randomUUID(), currency: 'USD', ...data };
    this.users.push(user);
    return user;
  }
}
