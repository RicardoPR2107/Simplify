import { expect, test } from '@playwright/test';
import { createMovementsViaApi, registerViaApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerViaApi(page);
});

test.describe('Categorías', () => {
  test('una cuenta nueva tiene las categorías predeterminadas', async ({ page }) => {
    await page.goto('/categorias');
    await expect(
      page.getByRole('list', { name: 'Categorías de gastos' }).getByRole('listitem'),
    ).toHaveCount(7);
    await expect(
      page.getByRole('list', { name: 'Categorías de ingresos' }).getByRole('listitem'),
    ).toHaveCount(4);
  });

  test('crea una categoría y no permite repetir el nombre', async ({ page }) => {
    await page.goto('/categorias');

    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    let dialog = page.getByRole('dialog', { name: 'Nueva categoría' });
    await dialog.getByLabel('Nombre').fill('Mascotas');
    await dialog.getByRole('button', { name: 'Crear categoría' }).click();
    await expect(page.getByRole('list', { name: 'Categorías de gastos' })).toContainText(
      'Mascotas',
    );

    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    dialog = page.getByRole('dialog', { name: 'Nueva categoría' });
    await dialog.getByLabel('Nombre').fill('MASCOTAS');
    await dialog.getByRole('button', { name: 'Crear categoría' }).click();
    await expect(dialog.getByText(/Ya tienes una categoría con ese nombre/)).toBeVisible();
  });

  test('al eliminar una categoría con movimientos, los pasa a otra del mismo tipo', async ({
    page,
  }) => {
    await createMovementsViaApi(page, [
      { type: 'EXPENSE', amount: '60', description: 'Cine', category: 'Entretenimiento' },
      { type: 'EXPENSE', amount: '25', description: 'Streaming', category: 'Entretenimiento' },
    ]);
    await page.goto('/categorias');
    const expenses = page.getByRole('list', { name: 'Categorías de gastos' });
    await expect(expenses.getByRole('link', { name: '2 movimientos' })).toBeVisible();

    await expenses.getByRole('button', { name: 'Eliminar Entretenimiento' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Eliminar "Entretenimiento"?' });
    await dialog.getByRole('button', { name: 'Mover y eliminar' }).click();
    await expect(dialog.getByText('Elige a qué categoría pasarán los movimientos.')).toBeVisible();

    await dialog.getByLabel('Mover los movimientos a').selectOption({ label: 'Otros gastos' });
    await dialog.getByRole('button', { name: 'Mover y eliminar' }).click();
    await expect(page.getByText('Categoría eliminada')).toBeVisible();
    await expect(expenses).not.toContainText('Entretenimiento');

    // Los movimientos siguen existiendo, ahora en "Otros gastos".
    await page.goto('/historial');
    const table = page.getByRole('table', { name: 'Movimientos' });
    await expect(table.getByRole('row', { name: /Cine/ })).toContainText('Otros gastos');
    await expect(table.getByRole('row', { name: /Streaming/ })).toContainText('Otros gastos');
  });
});
