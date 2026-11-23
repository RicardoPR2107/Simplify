import { fromCents, percentage, toCents, type MonthSummary } from '@simplify/shared';

export interface MonthRow extends MonthSummary {
  /** Parte de los ingresos que no se gastó, en %. `null` si no hubo ingresos (no se puede calcular). */
  savingsRate: number | null;
}

export interface PeriodStats {
  income: string;
  expense: string;
  balance: string;
  savingsRate: number | null;
  averageExpense: string;
  highestExpense: MonthSummary | null;
  deficitMonths: number;
  rows: MonthRow[];
}

/**
 * Indicadores de un periodo a partir de los totales mensuales de la API.
 * Toda la aritmética es en céntimos (bigint): ningún importe pasa por `number`.
 */
export function computeStats(months: MonthSummary[]): PeriodStats {
  let income = 0n;
  let expense = 0n;
  let highestExpense: MonthSummary | null = null;
  let deficitMonths = 0;

  const rows = months.map((month) => {
    const monthIncome = toCents(month.income);
    const monthExpense = toCents(month.expense);
    income += monthIncome;
    expense += monthExpense;
    if (monthExpense > 0n && (!highestExpense || monthExpense > toCents(highestExpense.expense))) {
      highestExpense = month;
    }
    if (monthIncome - monthExpense < 0n) deficitMonths++;
    return {
      ...month,
      savingsRate: monthIncome > 0n ? percentage(monthIncome - monthExpense, monthIncome) : null,
    };
  });

  const balance = income - expense;
  const count = BigInt(Math.max(months.length, 1));
  // Promedio redondeado al céntimo más cercano (los gastos nunca son negativos).
  const averageExpense = (expense * 2n + count) / (2n * count);

  return {
    income: fromCents(income),
    expense: fromCents(expense),
    balance: fromCents(balance),
    savingsRate: income > 0n ? percentage(balance, income) : null,
    averageExpense: fromCents(averageExpense),
    highestExpense,
    deficitMonths,
    rows,
  };
}
