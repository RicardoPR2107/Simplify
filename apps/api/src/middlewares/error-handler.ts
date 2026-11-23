import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, errorMessages, toFieldErrors, type ApiErrorBody } from '@simplify/shared';
import { AppError } from '../errors/app-error.js';

/** Rutas que no existen → 404 con el mismo formato que cualquier otro error. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound());
};

/**
 * Manejador central de errores (último middleware de la cadena).
 * - AppError: error de negocio esperado → su código y estado.
 * - ZodError: datos inválidos → 400 con los errores por campo.
 * - Errores del lector de JSON (mal formado → 400, demasiado grande → 413).
 * - Cualquier otro: error inesperado → 500 sin detalles internos (se registra en el log).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = typeof req.id === 'string' ? req.id : undefined;

  let status = 500;
  let body: ApiErrorBody;

  if (err instanceof AppError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, requestId, fields: err.fields } };
    if (err.retryAfterSeconds !== undefined) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: errorMessages.VALIDATION_ERROR,
        requestId,
        fields: toFieldErrors(err),
      },
    };
  } else if (bodyParserType(err) === 'entity.parse.failed') {
    status = 400;
    body = {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'El cuerpo de la petición no es un JSON válido.',
        requestId,
      },
    };
  } else if (bodyParserType(err) === 'entity.too.large') {
    status = 413;
    body = {
      error: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: errorMessages.PAYLOAD_TOO_LARGE,
        requestId,
      },
    };
  } else {
    req.log?.error({ err }, 'Error inesperado');
    body = {
      error: { code: ErrorCode.INTERNAL_ERROR, message: errorMessages.INTERNAL_ERROR, requestId },
    };
  }

  res.status(status).json(body);
};

/** Los errores del lector de JSON de Express traen un `type` que identifica el problema. */
function bodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const { type } = err as { type?: unknown };
    return typeof type === 'string' ? type : undefined;
  }
  return undefined;
}
