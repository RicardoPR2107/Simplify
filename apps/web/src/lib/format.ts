import type { Currency } from '@simplify/shared';

/**
 * Formatea un importe para mostrarlo ("S/ 1,250.50"). Recibe el TEXTO de la API:
 * Intl.NumberFormat acepta cadenas, así que el importe nunca pasa por `number`.
 * `signed` antepone + o − según el tipo de movimiento.
 */
export function formatMoney(
  amount: string,
  currency: Currency,
  sign?: 'INCOME' | 'EXPENSE',
): string {
  const formatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const text = formatter.format(amount as unknown as number);
  if (!sign) return text;
  return `${sign === 'INCOME' ? '+' : '−'}${text}`;
}

/** "2026-11-15" → "15 nov 2026". Se lee en UTC para que la zona horaria no cambie el día. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace('.', '');
}

/** Fecha de hoy en la zona horaria de la persona, en formato AAAA-MM-DD. */
export function todayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Lo que escribe la persona → importe para la API: admite coma decimal y espacios.
 * "1 250,5" → "1250.5". La validación final la hace el esquema compartido.
 */
export function normalizeAmountInput(value: string): string {
  return value.trim().replace(/\s/g, '').replace(',', '.');
}
