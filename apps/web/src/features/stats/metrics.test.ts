import { describe, expect, it } from 'vitest';
import { computeStats } from './metrics';

const month = (m: number, income: string, expense: string) => ({
  year: 2026,
  month: m,
  income,
  expense,
  balance: '0',
});

describe('computeStats', () => {
  const stats = computeStats([
    month(6, '3000.00', '2000.00'),
    month(7, '3000.00', '3300.50'),
    month(8, '0.00', '0.00'),
    month(9, '3500.10', '1999.90'),
    month(10, '0.00', '120.00'),
    month(11, '4000.00', '2500.00'),
  ]);

  it('suma ingresos, gastos y ahorro sin errores de redondeo', () => {
    expect(stats.income).toBe('13500.10');
    expect(stats.expense).toBe('9920.40');
    expect(stats.balance).toBe('3579.70');
  });

  it('calcula la tasa de ahorro del periodo', () => {
    expect(stats.savingsRate).toBe(26.5);
  });

  it('promedia el gasto mensual redondeando al céntimo', () => {
    expect(stats.averageExpense).toBe('1653.40');
  });

  it('encuentra el mes con más gastos y cuenta los meses en negativo', () => {
    expect(stats.highestExpense?.month).toBe(7);
    expect(stats.deficitMonths).toBe(2);
  });

  it('sin ingresos en un mes, su tasa de ahorro no se puede calcular', () => {
    expect(stats.rows[2]!.savingsRate).toBeNull();
    expect(stats.rows[4]!.savingsRate).toBeNull();
    expect(stats.rows[1]!.savingsRate).toBe(-10);
  });

  it('un periodo sin movimientos no tiene mes destacado ni tasa', () => {
    const empty = computeStats([month(11, '0.00', '0.00')]);
    expect(empty.highestExpense).toBeNull();
    expect(empty.savingsRate).toBeNull();
    expect(empty.averageExpense).toBe('0.00');
  });
});
