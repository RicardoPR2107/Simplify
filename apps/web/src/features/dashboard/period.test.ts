import { describe, expect, it } from 'vitest';
import { isAfter, periodLabel, shiftPeriod } from './period';

describe('Periodos del dashboard', () => {
  it('se mueve entre meses cruzando el cambio de año', () => {
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('compara periodos', () => {
    expect(isAfter({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBe(true);
    expect(isAfter({ year: 2026, month: 11 }, { year: 2026, month: 11 })).toBe(false);
  });

  it('muestra el nombre del mes en español', () => {
    expect(periodLabel({ year: 2026, month: 11 })).toBe('Noviembre 2026');
    expect(periodLabel({ year: 2026, month: 11 }, 'short')).toBe('nov');
  });
});
