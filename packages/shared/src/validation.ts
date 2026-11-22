import type { z } from 'zod';

/**
 * Convierte los errores de Zod en `{ campo: [mensajes] }`.
 * La API lo envía en `error.fields` y los formularios lo muestran junto a cada campo.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Valida y, si falla, devuelve los errores por campo. Lo usan los formularios del frontend. */
export function parseWithFieldErrors<T>(
  schema: z.ZodType<T>,
  values: unknown,
): { success: true; data: T } | { success: false; fields: Record<string, string[]> } {
  const result = schema.safeParse(values);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, fields: toFieldErrors(result.error) };
}
