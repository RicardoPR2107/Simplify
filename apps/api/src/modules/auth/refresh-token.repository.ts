import type { PrismaClient } from '../../generated/prisma/client.js';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewRefreshToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
}

export interface RefreshTokenRepository {
  create(data: NewRefreshToken): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Revoca un token si seguía activo. Devuelve `false` si otro proceso ya lo había revocado. */
  revoke(id: string, at: Date): Promise<boolean>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { ...data, userAgent: data.userAgent?.slice(0, 255) },
    });
  }

  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    // `updateMany` con `revokedAt: null` es atómico: si dos peticiones usan el mismo token a la vez,
    // solo una consigue revocarlo y la otra se trata como reutilización.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return count === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
