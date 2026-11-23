import { ErrorCode, errorMessages } from '@simplify/shared';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  EMAIL_ALREADY_REGISTERED: 409,
  TOO_MANY_ATTEMPTS: 429,
  CSRF_TOKEN_INVALID: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CATEGORY_TYPE_MISMATCH: 422,
  CATEGORY_IN_USE: 409,
  CATEGORY_ALREADY_EXISTS: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/**
 * Error de negocio "esperado" (por ejemplo, categoría incompatible).
 * Los servicios lo lanzan y el manejador central de errores lo convierte en la respuesta HTTP.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: Record<string, string[]> | undefined;
  /** Segundos que el cliente debe esperar antes de reintentar (cabecera Retry-After en 429). */
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      fields?: Record<string, string[]>;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(options.message ?? errorMessages[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  static notFound(): AppError {
    return new AppError(ErrorCode.NOT_FOUND);
  }
}
