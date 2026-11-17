/**
 * Códigos de error que la API devuelve en `{ error: { code, message } }`.
 * El frontend usa el código (no el texto) para decidir qué mostrar.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CATEGORY_TYPE_MISMATCH: 'CATEGORY_TYPE_MISMATCH',
  CATEGORY_IN_USE: 'CATEGORY_IN_USE',
  CATEGORY_ALREADY_EXISTS: 'CATEGORY_ALREADY_EXISTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Mensajes en español pensados para la persona usuaria, no para el desarrollador. */
export const errorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Revisa los datos marcados e inténtalo de nuevo.',
  PAYLOAD_TOO_LARGE: 'La información enviada es demasiado grande.',
  UNAUTHENTICATED: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  INVALID_CREDENTIALS: 'El correo o la contraseña no son correctos.',
  EMAIL_ALREADY_REGISTERED: 'Ya existe una cuenta con ese correo.',
  TOO_MANY_ATTEMPTS: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
  CSRF_TOKEN_INVALID: 'La página quedó desactualizada. Recárgala e inténtalo otra vez.',
  FORBIDDEN: 'No tienes permiso para hacer esto.',
  NOT_FOUND: 'No encontramos lo que buscas.',
  CATEGORY_TYPE_MISMATCH: 'Esa categoría no corresponde al tipo de movimiento elegido.',
  CATEGORY_IN_USE: 'Esta categoría tiene movimientos. Reasígnalos antes de eliminarla.',
  CATEGORY_ALREADY_EXISTS: 'Ya tienes una categoría con ese nombre.',
  SERVICE_UNAVAILABLE:
    'El servicio no está disponible en este momento. Inténtalo en unos segundos.',
  INTERNAL_ERROR: 'Algo salió mal de nuestro lado. Inténtalo de nuevo.',
};

/** Forma de toda respuesta de error de la API. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    /** Errores por campo: `{ amount: ['El importe debe ser mayor que cero.'] }` */
    fields?: Record<string, string[]>;
  };
}
