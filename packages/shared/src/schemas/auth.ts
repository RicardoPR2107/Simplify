import { z } from 'zod';
import { currencySchema } from '../money.js';

export const emailSchema = z
  .string({ error: 'El correo es obligatorio.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Escribe un correo válido.' }))
  .refine((value) => value.length <= 254, 'El correo es demasiado largo.');

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(128, 'La contraseña no puede superar los 128 caracteres.')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.');

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
