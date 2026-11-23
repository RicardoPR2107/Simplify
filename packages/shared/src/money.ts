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
  .min(1, 'Escribe el importe.')
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

/**
 * Aritmética de dinero sin `number`: se trabaja en céntimos con `bigint` (enteros exactos).
 * "85.50" → 8550n. Acepta signo negativo para los balances.
 */
export function toCents(amount: string): bigint {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) throw new Error(`Importe no válido: ${amount}`);
  const [, sign, units, decimals = ''] = match;
  const cents = BigInt(units!) * 100n + BigInt(decimals.padEnd(2, '0'));
  return sign ? -cents : cents;
}

/** 8550n → "85.50"; -1250n → "-12.50". */
export function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const units = abs / 100n;
  const decimals = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${units}.${decimals}`;
}

/**
 * Porcentaje de `part` sobre `total` con 1 decimal, redondeado (12.35 → 12.4; −10.02 → −10.0).
 * Solo para mostrar. Se redondea el valor absoluto y luego se aplica el signo, porque la división
 * de bigint trunca hacia cero y sesgaría los negativos.
 */
export function percentage(part: bigint, total: bigint): number {
  if (total === 0n) return 0;
  const negative = part < 0n !== total < 0n;
  const absPart = part < 0n ? -part : part;
  const absTotal = total < 0n ? -total : total;
  const tenths = (absPart * 2000n + absTotal) / (2n * absTotal); // redondeo a la décima más cercana
  return (negative ? -Number(tenths) : Number(tenths)) / 10;
}
