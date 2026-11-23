import { z } from 'zod';
import { currencySchema, type Currency } from '../money.js';

export const emailSchema = z
  .string({ error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Escribe un correo válido.' }))
  .refine((value) => value.length <= 254, 'El correo es demasiado largo.');

/**
 * Contraseña segura: mínimo 8 caracteres, con minúscula, mayúscula, número y carácter especial.
 * Cada regla tiene su propio mensaje para que el formulario diga exactamente qué falta.
 */
export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede superar los 128 caracteres.')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula.')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.')
  .regex(
    /[^A-Za-z0-9]/,
    'La contraseña debe incluir al menos un carácter especial (por ejemplo # $ % & !).',
  );

export const displayNameSchema = z
  .string({ error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(60, 'El nombre no puede superar los 60 caracteres.');

export const registerSchema = z.object({
  name: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'Escribe tu contraseña.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    name: displayNameSchema,
    currency: currencySchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Envía al menos un campo para actualizar.');
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Datos públicos del usuario: lo único que la API devuelve sobre una cuenta. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: Currency;
}
