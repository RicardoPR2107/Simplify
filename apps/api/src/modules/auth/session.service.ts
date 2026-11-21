import { ErrorCode } from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { RefreshTokenRepository } from './refresh-token.repository.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  type TokenService,
} from './token.service.js';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sesiones (docs/adr/0002):
 * - Token de acceso: JWT de 15 minutos que la API verifica sin consultar la base de datos.
 * - Token de renovación: 7 días, guardado como hash. Cada uso lo ROTA (se revoca y se emite otro).
 * - Si llega un token ya revocado, alguien lo copió: se cierran todas las sesiones del usuario.
 */
export class SessionService {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async start(userId: string, userAgent?: string): Promise<SessionTokens> {
    const refreshToken = generateRefreshToken();
    await this.refreshTokens.create({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(this.now().getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent,
    });
    return { accessToken: await this.tokens.signAccessToken(userId), refreshToken };
  }

  /** Cambia un token de renovación válido por un par nuevo. */
  async rotate(
    refreshToken: string | undefined,
    userAgent?: string,
  ): Promise<{ userId: string; tokens: SessionTokens }> {
    if (!refreshToken) throw new AppError(ErrorCode.UNAUTHENTICATED);

    const stored = await this.refreshTokens.findByHash(hashRefreshToken(refreshToken));
    if (!stored) throw new AppError(ErrorCode.UNAUTHENTICATED);

    const now = this.now();
    if (stored.revokedAt || !(await this.refreshTokens.revoke(stored.id, now))) {
      // Reutilización de un token ya usado: posible robo. Se cierran todas las sesiones.
      await this.refreshTokens.revokeAllForUser(stored.userId, now);
      throw new AppError(ErrorCode.UNAUTHENTICATED);
    }
    if (stored.expiresAt <= now) throw new AppError(ErrorCode.UNAUTHENTICATED);

    return { userId: stored.userId, tokens: await this.start(stored.userId, userAgent) };
  }

  /** Cierre de sesión (RF-03): el token de renovación deja de servir aunque alguien lo tenga. */
  async end(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await this.refreshTokens.findByHash(hashRefreshToken(refreshToken));
    if (stored) await this.refreshTokens.revoke(stored.id, this.now());
  }
}
