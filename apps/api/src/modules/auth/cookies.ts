import type { CookieOptions, Response } from 'express';
import type { SessionTokens } from './session.service.js';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from './token.service.js';

export const ACCESS_COOKIE = 'simplify_at';
export const REFRESH_COOKIE = 'simplify_rt';
/** El token de renovación solo viaja a las rutas de autenticación, no en cada petición. */
const REFRESH_PATH = '/api/v1/auth';

/**
 * - httpOnly: JavaScript no puede leerlas (protege contra XSS).
 * - SameSite=Lax: el navegador no las envía en peticiones que otro sitio provoque con POST (ayuda contra CSRF).
 * - Secure en producción: solo viajan por HTTPS.
 */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure };
}

export function setSessionCookies(res: Response, tokens: SessionTokens, secure: boolean): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(secure),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(secure),
    path: REFRESH_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(secure), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(secure), path: REFRESH_PATH });
}
