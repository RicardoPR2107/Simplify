import { describe, expect, it } from 'vitest';
import { niceMax } from './EvolutionChart';

describe('niceMax (tope del eje del gráfico)', () => {
  it('queda apenas por encima del valor más alto, en una cifra redonda', () => {
    expect(niceMax(5234.79)).toBe(6000);
    expect(niceMax(4200)).toBe(5000);
    expect(niceMax(1100)).toBe(1200);
    expect(niceMax(780)).toBe(800);
    expect(niceMax(30000)).toBe(30000);
  });

  it('funciona con importes pequeños sin restos de coma flotante', () => {
    expect(niceMax(0.27)).toBe(0.3);
    expect(niceMax(12.5)).toBe(15);
  });

  it('usa 100 cuando no hay datos', () => {
    expect(niceMax(0)).toBe(100);
  });
});
