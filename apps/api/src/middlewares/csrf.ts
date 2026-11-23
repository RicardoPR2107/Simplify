import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { ErrorCode } from '@simplify/shared';
import { AppError } from '../errors/app-error.js';

export const CSRF_COOKIE = 'simplify_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Métodos que solo leen datos: no necesitan token porque no cambian nada. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

/**
 * Protección CSRF con "doble envío" (double submit cookie, docs/adr/0002).
 *
 * El servidor entrega un token aleatorio en una cookie que JavaScript SÍ puede leer.
 * El frontend lo copia en la cabecera `X-CSRF-Token` de cada petición que modifica datos.
 * Un sitio ajeno puede hacer que el navegador envíe la cookie, pero no puede leerla
 * (el navegador lo impide entre dominios), así que no puede poner la cabecera correcta.
 */
export function csrfProtection(): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    const cookie: unknown = req.cookies?.[CSRF_COOKIE];
    const header = req.get(CSRF_HEADER);
    next(
      typeof cookie === 'string' && typeof header === 'string' && sameToken(cookie, header)
        ? undefined
        : new AppError(ErrorCode.CSRF_TOKEN_INVALID),
    );
  };
}

/**
 * Devuelve el token CSRF del navegador o crea uno nuevo.
 * La cookie NO es httpOnly a propósito: el frontend necesita leerla.
 */
export function issueCsrfToken(current: unknown, res: Response, secure: boolean): string {
  const token =
    typeof current === 'string' && TOKEN_FORMAT.test(current)
      ? current
      : randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', secure, path: '/' });
  return token;
}

/** Comparación en tiempo constante: no revela cuántos caracteres coinciden. */
function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
