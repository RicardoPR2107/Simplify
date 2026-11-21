import { parseWithFieldErrors } from '@simplify/shared';
import { ApiError } from '../../lib/api';

export type FieldErrors = Record<string, string | undefined>;

/** Valida con el mismo esquema que la API y devuelve el primer mensaje de cada campo. */
export function validateForm<T>(
  schema: Parameters<typeof parseWithFieldErrors<T>>[0],
  values: unknown,
): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = parseWithFieldErrors(schema, values);
  if (result.success) return { data: result.data, errors: null };
  return { data: null, errors: firstErrors(result.fields) };
}

export function firstErrors(fields: Record<string, string[]>): FieldErrors {
  return Object.fromEntries(Object.entries(fields).map(([key, list]) => [key, list[0]]));
}

/** Mensaje general para un error de la API, con el tiempo de espera si hubo demasiados intentos. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Inténtalo de nuevo.';
  if (error.code === 'TOO_MANY_ATTEMPTS' && error.retryAfter) {
    const minutes = Math.ceil(error.retryAfter / 60);
    return `Demasiados intentos. Vuelve a intentarlo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
  }
  return error.message;
}

/** Lleva el foco al primer campo con error para que se vea y lo anuncien los lectores de pantalla. */
export function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors): void {
  const first = Object.keys(errors).find((key) => errors[key]);
  if (first) form?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
}
