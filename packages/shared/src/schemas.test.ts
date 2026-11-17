import { describe, expect, it } from 'vitest';
import {
  amountSchema,
  createMovementSchema,
  isoDateSchema,
  listMovementsQuerySchema,
  registerSchema,
  toFieldErrors,
} from './index.js';

const validMovement = {
  type: 'EXPENSE',
  description: 'Compra de supermercado',
  amount: '85.50',
  categoryId: '7f1c2b8e-4b1a-4c2e-9a3d-2f6e8b9c0d11',
  date: '2026-11-15',
};

describe('amountSchema (RN-01: importe mayor que cero)', () => {
  it.each(['85.50', '1', '0.01', '2000', '9999999999.99'])('acepta %s', (value) => {
    expect(amountSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['cero', '0'],
    ['cero con decimales', '0.00'],
    ['negativo', '-10'],
    ['tres decimales', '1.005'],
    ['letras', 'abc'],
    ['vacío', ''],
    ['notación científica', '1e5'],
    ['más de 10 dígitos enteros', '12345678901'],
  ])('rechaza %s (%s)', (_label, value) => {
    expect(amountSchema.safeParse(value).success).toBe(false);
  });

  it('explica el motivo cuando el importe es cero', () => {
    const result = amountSchema.safeParse('0');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('El importe debe ser mayor que cero.');
  });
});

describe('isoDateSchema (RN-08: fecha válida)', () => {
  it('acepta el último día de un mes', () => {
    expect(isoDateSchema.safeParse('2026-11-30').success).toBe(true);
  });

  it('acepta el 29 de febrero en año bisiesto', () => {
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true);
  });

  it.each(['2026-02-29', '2026-11-31', '2026-13-01', '15/11/2026'])('rechaza %s', (value) => {
    expect(isoDateSchema.safeParse(value).success).toBe(false);
  });
});

describe('createMovementSchema', () => {
  it('acepta un gasto válido', () => {
    expect(createMovementSchema.safeParse(validMovement).success).toBe(true);
  });

  it('rechaza un tipo distinto de ingreso o gasto (RN-02)', () => {
    const result = createMovementSchema.safeParse({ ...validMovement, type: 'TRANSFER' });
    expect(result.success).toBe(false);
  });

  it('devuelve los errores agrupados por campo', () => {
    const result = createMovementSchema.safeParse({ ...validMovement, amount: '0', date: 'x' });
    expect(result.success).toBe(false);
    const fields = toFieldErrors(result.error!);
    expect(fields.amount).toContain('El importe debe ser mayor que cero.');
    expect(fields.date).toBeDefined();
  });
});

describe('listMovementsQuerySchema (paginación y filtros)', () => {
  it('aplica valores por defecto', () => {
    const result = listMovementsQuerySchema.parse({});
    expect(result).toMatchObject({ page: 1, pageSize: 10, sortBy: 'date', order: 'desc' });
  });

  it('limita el tamaño de página a 50', () => {
    expect(listMovementsQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('rechaza un rango de fechas invertido', () => {
    const result = listMovementsQuerySchema.safeParse({ from: '2026-11-30', to: '2026-11-01' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('normaliza el correo a minúsculas', () => {
    const result = registerSchema.parse({
      name: 'Ricardo',
      email: '  Ricardo@Example.COM ',
      password: 'claveSegura123',
    });
    expect(result.email).toBe('ricardo@example.com');
  });

  it('exige letras y números en la contraseña', () => {
    const result = registerSchema.safeParse({
      name: 'Ricardo',
      email: 'r@example.com',
      password: 'soloLetrasMuyLargas',
    });
    expect(result.success).toBe(false);
  });
});
