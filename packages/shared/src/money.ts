import { z } from 'zod';

/**
 * Los importes viajan como TEXTO con hasta 2 decimales ("85.50"), nunca como `number`.
 * Así se evitan errores de punto flotante (0.1 + 0.2 !== 0.3) entre el navegador,
 * la API y PostgreSQL, donde se guardan como NUMERIC(12,2). Ver docs/adr/0003.
 */
export const MAX_AMOUNT = '9999999999.99';

const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const amountSchema = z
  .string({ error: 'El importe es obligatorio.' })
  .trim()
  .regex(AMOUNT_PATTERN, 'Usa solo números, con hasta 2 decimales (por ejemplo 85.50).')
  .refine((value) => !/^0+(\.0{1,2})?$/.test(value), {
    message: 'El importe debe ser mayor que cero.',
  });

export type Amount = z.infer<typeof amountSchema>;

export const SUPPORTED_CURRENCIES = ['USD', 'PEN', 'EUR', 'MXN', 'COP'] as const;
export const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
  error: 'Moneda no admitida.',
});
export type Currency = z.infer<typeof currencySchema>;
