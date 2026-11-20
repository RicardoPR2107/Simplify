import { randomUUID } from 'node:crypto';
import type {
  NewRefreshToken,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../src/modules/auth/refresh-token.repository.js';

/** Doble de prueba de los tokens de renovación, en memoria. */
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: Array<RefreshTokenRecord & { tokenHash: string }> = [];

  async create(data: NewRefreshToken): Promise<void> {
    this.tokens.push({ id: randomUUID(), revokedAt: null, ...data });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    const token = this.tokens.find((t) => t.id === id && t.revokedAt === null);
    if (!token) return false;
    token.revokedAt = at;
    return true;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId && token.revokedAt === null) token.revokedAt = at;
    }
  }
}
