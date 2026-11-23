import { expect, test } from '@playwright/test';
import { createMovementsViaApi, registerViaApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerViaApi(page);
  await createMovementsViaApi(page, [
    { type: 'INCOME', amount: '3000.10', description: 'Sueldo', category: 'Salario' },
    { type: 'EXPENSE', amount: '0.10', description: 'Caramelo', category: 'Alimentación' },
    { type: 'EXPENSE', amount: '0.20', description: 'Chicle', category: 'Alimentación' },
    { type: 'EXPENSE', amount: '1200', description: 'Alquiler', category: 'Vivienda' },
  ]);
});

test.describe('Dashboard y estadísticas', () => {
  test('el balance del mes es exacto (sin errores de redondeo)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Balance del mes' })).toContainText(
      /\$\s?1,799\.80/,
    );
    await expect(page.getByRole('region', { name: 'Gastos', exact: true })).toContainText(
      /1,200\.30/,
    );
  });

  test('los gastos por categoría llevan al historial filtrado', async ({ page }) => {
    await page.goto('/');
    const breakdown = page.getByRole('list', { name: 'Gastos por categoría' });
    await expect(breakdown.getByRole('listitem').first()).toContainText('Vivienda');

    await breakdown.getByRole('link', { name: 'Alimentación' }).click();
    await expect(page).toHaveURL(/\/historial\?type=EXPENSE&categoryId=.+&from=.+&to=/);
    await expect(page.getByRole('table', { name: 'Movimientos' }).getByRole('row')).toHaveCount(3);
  });

  test('un registro nuevo actualiza el dashboard sin recargar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Balance del mes' })).toContainText(/1,799\.80/);

    await page.getByRole('link', { name: 'Nuevo movimiento' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
    await dialog.getByLabel('Importe').fill('99.80');
    await dialog.getByLabel('Descripción').fill('Farmacia');
    await dialog.getByLabel('Categoría').selectOption({ label: 'Salud' });
    await dialog.getByRole('button', { name: 'Registrar' }).click();

    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page.getByRole('region', { name: 'Balance del mes' })).toContainText(/1,700\.00/);
  });

  test('las estadísticas calculan la tasa de ahorro del periodo', async ({ page }) => {
    await page.goto('/estadisticas');
    // 1,799.80 / 3,000.10 = 59.99… → 60%
    await expect(page.locator('dt', { hasText: 'Tasa de ahorro' }).locator('..')).toContainText(
      /60(\.0)?\s?%/,
    );
    const table = page.getByRole('table', { name: /tasa de ahorro por mes/ });
    await expect(table.getByRole('row', { name: /Total/ })).toContainText(/3,000\.10/);
  });
});
