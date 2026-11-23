import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrisma, resetData } from './database.js';

/**
 * Comprueba que la propia base de datos hace cumplir las reglas de negocio,
 * aunque el código de la API tuviera un error. Ver docs/modelo-datos.md.
 */
const prisma = createTestPrisma();

async function createUser(email: string) {
  return prisma.user.create({ data: { email, name: 'Prueba', passwordHash: 'x' } });
}

async function createCategory(userId: string, type: 'INCOME' | 'EXPENSE', name = 'Comida') {
  return prisma.category.create({ data: { userId, type, name } });
}

function movement(userId: string, categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    userId,
    categoryId,
    type: 'EXPENSE' as const,
    description: 'Supermercado',
    amount: '85.50',
    date: new Date('2026-11-15'),
    ...overrides,
  };
}

beforeEach(() => resetData(prisma));
afterAll(() => prisma.$disconnect());

describe('Restricciones de la base de datos', () => {
  it('acepta un movimiento válido y guarda el importe con precisión decimal', async () => {
    const user = await createUser('a@example.com');
    const category = await createCategory(user.id, 'EXPENSE');

    const created = await prisma.movement.create({ data: movement(user.id, category.id) });
    expect(created.amount.toString()).toBe('85.5');
  });

  it('RN-01: rechaza un importe igual a cero', async () => {
    const user = await createUser('a@example.com');
    const category = await createCategory(user.id, 'EXPENSE');

    await expect(
      prisma.movement.create({ data: movement(user.id, category.id, { amount: '0' }) }),
    ).rejects.toThrow();
  });

  it('RN-01: rechaza un importe negativo', async () => {
    const user = await createUser('a@example.com');
    const category = await createCategory(user.id, 'EXPENSE');

    await expect(
      prisma.movement.create({ data: movement(user.id, category.id, { amount: '-10' }) }),
    ).rejects.toThrow();
  });

  it('RN-03: rechaza un gasto con una categoría de ingreso', async () => {
    const user = await createUser('a@example.com');
    const income = await createCategory(user.id, 'INCOME', 'Salario');

    await expect(prisma.movement.create({ data: movement(user.id, income.id) })).rejects.toThrow();
  });

  it('RN-05: rechaza usar la categoría de otro usuario', async () => {
    const owner = await createUser('a@example.com');
    const intruder = await createUser('b@example.com');
    const category = await createCategory(owner.id, 'EXPENSE');

    await expect(
      prisma.movement.create({ data: movement(intruder.id, category.id) }),
    ).rejects.toThrow();
  });

  it('RN-09: impide borrar una categoría que tiene movimientos', async () => {
    const user = await createUser('a@example.com');
    const category = await createCategory(user.id, 'EXPENSE');
    await prisma.movement.create({ data: movement(user.id, category.id) });

    await expect(prisma.category.delete({ where: { id: category.id } })).rejects.toThrow();
  });

  it('al borrar un usuario se borran sus categorías y movimientos', async () => {
    const user = await createUser('a@example.com');
    const category = await createCategory(user.id, 'EXPENSE');
    await prisma.movement.create({ data: movement(user.id, category.id) });

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.category.count()).toBe(0);
    expect(await prisma.movement.count()).toBe(0);
  });
});
