import { describe, expect, it } from 'vitest';
import { addMonths, monthRange, SummaryService } from './summary.service.js';
import type { SummaryRepository } from './summary.repository.js';

describe('Cálculo de periodos', () => {
  it('suma y resta meses cruzando el cambio de año', () => {
    expect(addMonths(2026, 2, -3)).toEqual({ year: 2025, month: 11 });
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('el rango de un mes va del día 1 al día 1 del mes siguiente (sin incluirlo)', () => {
    expect(monthRange(2026, 12, 1)).toEqual({ from: '2026-12-01', to: '2027-01-01' });
    expect(monthRange(2026, 8, 6)).toEqual({ from: '2026-08-01', to: '2027-02-01' });
  });
});

function fakeRepo(overrides: Partial<SummaryRepository>): SummaryRepository {
  return {
    totalsByType: async () => ({ INCOME: '0', EXPENSE: '0' }),
    totalsByCategory: async () => [],
    monthlyTotals: async () => [],
    ...overrides,
  };
}

describe('SummaryService', () => {
  it('calcula un balance negativo cuando se gasta más de lo que entra', async () => {
    const service = new SummaryService(
      fakeRepo({ totalsByType: async () => ({ INCOME: '1000.10', EXPENSE: '1200.35' }) }),
    );
    expect(await service.month('u', 2026, 11)).toEqual({
      year: 2026,
      month: 11,
      income: '1000.10',
      expense: '1200.35',
      balance: '-200.25',
    });
  });

  it('un mes sin movimientos devuelve ceros, no un error', async () => {
    const service = new SummaryService(fakeRepo({}));
    expect(await service.month('u', 2026, 11)).toMatchObject({ income: '0.00', balance: '0.00' });
  });

  it('la evolución tiene siempre 6 meses en orden, incluidos los vacíos', async () => {
    const service = new SummaryService(
      fakeRepo({
        monthlyTotals: async () => [
          { month: '2025-12', type: 'INCOME', total: '500' },
          { month: '2026-02', type: 'EXPENSE', total: '120.5' },
        ],
      }),
    );
    const { months } = await service.evolution('u', 2026, 3);

    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-1',
      '2026-2',
      '2026-3',
    ]);
    expect(months[2]).toMatchObject({ income: '500.00', balance: '500.00' });
    expect(months[4]).toMatchObject({ expense: '120.50', balance: '-120.50' });
    expect(months[0]).toMatchObject({ income: '0.00', expense: '0.00' });
  });

  it('los porcentajes por categoría suman alrededor de 100', async () => {
    const service = new SummaryService(
      fakeRepo({
        totalsByCategory: async () => [
          { categoryId: 'a', name: 'Vivienda', total: '200' },
          { categoryId: 'b', name: 'Comida', total: '100' },
        ],
      }),
    );
    const summary = await service.byCategory('u', 2026, 11, 'EXPENSE');

    expect(summary.total).toBe('300.00');
    expect(summary.items.map((i) => i.percentage)).toEqual([66.7, 33.3]);
  });
});
