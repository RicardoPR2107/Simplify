import { useSearchParams } from 'react-router';

export interface Period {
  year: number;
  month: number;
}

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function currentPeriod(now = new Date()): Period {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftPeriod({ year, month }: Period, delta: number): Period {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function isAfter(a: Period, b: Period): boolean {
  return a.year * 12 + a.month > b.year * 12 + b.month;
}

/** "noviembre de 2026" → "Noviembre 2026"; con `short`, "nov". */
export function periodLabel({ year, month }: Period, style: 'long' | 'short' = 'long'): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  if (style === 'short') {
    return new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', '')
      .toLowerCase();
  }
  const name = new Intl.DateTimeFormat('es-PE', { month: 'long', timeZone: 'UTC' }).format(date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/**
 * Mes que muestra el dashboard, guardado en la URL (?mes=2026-11).
 * No se puede ir a meses futuros: aún no tienen movimientos que resumir.
 */
export function useDashboardPeriod() {
  const [params, setParams] = useSearchParams();
  const today = currentPeriod();
  const match = MONTH_PARAM.exec(params.get('mes') ?? '');
  const requested = match ? { year: Number(match[1]), month: Number(match[2]) } : today;
  const period = isAfter(requested, today) ? today : requested;

  function go(next: Period) {
    const isToday = next.year === today.year && next.month === today.month;
    setParams(isToday ? {} : { mes: `${next.year}-${String(next.month).padStart(2, '0')}` }, {
      replace: true,
    });
  }

  return {
    period,
    isCurrent: period.year === today.year && period.month === today.month,
    previous: () => go(shiftPeriod(period, -1)),
    next: () => go(shiftPeriod(period, 1)),
    reset: () => go(today),
  };
}
