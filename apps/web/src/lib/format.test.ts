import { describe, expect, it } from 'vitest';
import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  normalizeAmountInput,
  todayISO,
} from './format';

describe('Formato de dinero y fechas', () => {
  it('formatea importes con 2 decimales y símbolo de la moneda', () => {
    expect(formatMoney('1250.5', 'PEN')).toMatch(/S\/\s?1,250\.50/);
    expect(formatMoney('9999999999.99', 'USD')).toContain('9,999,999,999.99');
  });

  it('antepone el signo según el tipo de movimiento', () => {
    expect(formatMoney('10', 'PEN', 'INCOME').startsWith('+')).toBe(true);
    expect(formatMoney('10', 'PEN', 'EXPENSE').startsWith('−')).toBe(true);
  });

  it('muestra la fecha sin desfase de zona horaria', () => {
    expect(formatDate('2026-11-01')).toBe('1 nov 2026');
    expect(formatDate('2026-12-31')).toBe('31 dic 2026');
  });

  it('devuelve la fecha local de hoy', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('abrevia importes para gráficos sin decimales innecesarios', () => {
    expect(formatCompactMoney(849.6, 'PEN')).toMatch(/S\/\s?850$/);
    expect(formatCompactMoney(1309.7, 'PEN')).toMatch(/1\.3\s?K/);
  });

  it('acepta la coma decimal al escribir un importe', () => {
    expect(normalizeAmountInput(' 1 250,5 ')).toBe('1250.5');
  });
});
