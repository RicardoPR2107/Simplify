import { describe, expect, it } from 'vitest';
import { safeRedirect } from './redirect';

describe('safeRedirect (evita redirecciones abiertas)', () => {
  it('acepta rutas internas', () => {
    expect(safeRedirect('/historial?page=2')).toBe('/historial?page=2');
  });

  it.each([
    ['https://sitio-falso.com'],
    ['//sitio-falso.com'],
    ['/\\sitio-falso.com'],
    ['javascript:alert(1)'],
    [null],
    [''],
  ])('rechaza %s y vuelve al dashboard', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
