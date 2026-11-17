import { pino, type Logger } from 'pino';
import type { Env } from '../config/env.js';

/**
 * Logs estructurados en JSON (fáciles de buscar en producción).
 * En desarrollo se muestran legibles con pino-pretty.
 */
export function createLogger(env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>): Logger {
  return pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    // Nunca se escriben en los logs datos sensibles, aunque lleguen en la petición.
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', '*.password', '*.passwordHash'],
      censor: '[oculto]',
    },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : {}),
  });
}
