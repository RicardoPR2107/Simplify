import type { RequestHandler } from 'express';
import { ErrorCode } from '@simplify/shared';
import { AppError } from '../errors/app-error.js';
import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import type { TokenService } from '../modules/auth/token.service.js';

/**
 * Protege una ruta: exige un token de acceso válido en la cookie y deja el id del usuario en `req.userId`.
 * A partir de aquí, toda consulta debe filtrar por `req.userId`, nunca por un id que mande el cliente (RN-05).
 */
export function requireAuth(tokens: TokenService): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[ACCESS_COOKIE];
    const userId = typeof token === 'string' ? await tokens.verifyAccessToken(token) : null;
    if (!userId) {
      next(new AppError(ErrorCode.UNAUTHENTICATED));
      return;
    }
    req.userId = userId;
    next();
  };
}
