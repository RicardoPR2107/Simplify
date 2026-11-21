import { describe, expect, it } from 'vitest';
import { fromCents, percentage, toCents } from './money.js';

describe('Aritmética de dinero en céntimos', () => {
  it('convierte texto a céntimos y de vuelta sin perder precisión', () => {
    expect(toCents('85.5')).toBe(8550n);
    expect(toCents('0.10') + toCents('0.20')).toBe(toCents('0.30'));
    expect(fromCents(toCents('9999999999.99'))).toBe('9999999999.99');
  });

  it('formatea siempre con 2 decimales y admite negativos', () => {
    expect(fromCents(5n)).toBe('0.05');
    expect(fromCents(-1250n)).toBe('-12.50');
    expect(fromCents(0n)).toBe('0.00');
    expect(toCents('-12.5')).toBe(-1250n);
  });

  it('rechaza texto que no es un importe', () => {
    expect(() => toCents('12,50')).toThrow();
  });

  it('calcula porcentajes con 1 decimal redondeado', () => {
    expect(percentage(1n, 3n)).toBe(33.3);
    expect(percentage(2n, 3n)).toBe(66.7);
    expect(percentage(1235n, 10000n)).toBe(12.4);
    expect(percentage(5n, 0n)).toBe(0);
  });
});
