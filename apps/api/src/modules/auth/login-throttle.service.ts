import { createHash } from 'node:crypto';
import { ErrorCode } from '@simplify/shared';
import { AppError } from '../../errors/app-error.js';
import type { LoginAttemptRepository } from './login-attempt.repository.js';

/** Ventana de tiempo en la que se cuentan los intentos fallidos. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Fallos permitidos por cuenta: frena a quien prueba contraseñas contra un correo. */
export const MAX_FAILURES_PER_EMAIL = 5;
/** Fallos permitidos por IP: frena a quien prueba muchos correos desde el mismo equipo. */
export const MAX_FAILURES_PER_IP = 20;

interface Limit {
  key: string;
  max: number;
  /** Si un inicio de sesión correcto reinicia el contador. Solo para el correo: si el de la IP
   * se reiniciara, un atacante podría entrar en su propia cuenta para "limpiar" su IP. */
  resetsOnSuccess: boolean;
}

/**
 * Límite de intentos de inicio de sesión (docs/adr/0004), guardado en PostgreSQL.
 * Las claves se guardan como hash: la tabla no contiene correos ni IP en claro.
 * Es la primera barrera; en la Fase 6 Nginx añade otra por IP antes de llegar a la API.
 */
export class LoginThrottleService {
  constructor(
    private readonly attempts: LoginAttemptRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Lanza 429 TOO_MANY_ATTEMPTS (con Retry-After) si se superó algún límite. */
  async assertAllowed(email: string, ip: string): Promise<void> {
    const now = this.now();
    const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);

    for (const limit of limits(email, ip)) {
      let since = windowStart;
      if (limit.resetsOnSuccess) {
        const lastSuccess = await this.attempts.lastSuccessAt(limit.key);
        if (lastSuccess && lastSuccess > since) since = lastSuccess;
      }
      const { count, oldest } = await this.attempts.failuresSince(limit.key, since);
      if (count >= limit.max) {
        const unlockAt = (oldest ?? now).getTime() + LOGIN_WINDOW_MS;
        throw new AppError(ErrorCode.TOO_MANY_ATTEMPTS, {
          retryAfterSeconds: Math.max(1, Math.ceil((unlockAt - now.getTime()) / 1000)),
        });
      }
    }
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const now = this.now();
    for (const limit of limits(email, ip)) await this.attempts.record(limit.key, false, now);
  }

  async recordSuccess(email: string, ip: string): Promise<void> {
    const now = this.now();
    for (const limit of limits(email, ip)) {
      if (limit.resetsOnSuccess) await this.attempts.record(limit.key, true, now);
    }
  }
}

function limits(email: string, ip: string): Limit[] {
  return [
    { key: hashKey(`email:${email}`), max: MAX_FAILURES_PER_EMAIL, resetsOnSuccess: true },
    { key: hashKey(`ip:${ip}`), max: MAX_FAILURES_PER_IP, resetsOnSuccess: false },
  ];
}

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
