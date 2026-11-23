import { expect, test } from '@playwright/test';
import { createMovementsViaApi, registerViaApi, today } from './helpers';

test.beforeEach(async ({ page }) => {
  await registerViaApi(page);
});

test.describe('Movimientos', () => {
  test('registra un gasto desde el menú lateral y aparece en el historial', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Nuevo movimiento' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
    await expect(dialog.getByLabel('Importe')).toBeFocused();
    await dialog.getByLabel('Importe').fill('250,75');
    await dialog.getByLabel('Descripción').fill('Supermercado');
    await dialog.getByLabel('Categoría').selectOption({ label: 'Alimentación' });
    await dialog.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.getByText('Movimiento registrado')).toBeVisible();
    await expect(dialog).toBeHidden();
    const row = page
      .getByRole('table', { name: 'Movimientos' })
      .getByRole('row', { name: /Supermercado/ });
    await expect(row).toContainText('Alimentación');
    await expect(row).toContainText(/−\$\s?250\.75/);
  });

  test('valida el formulario y no envía datos incorrectos', async ({ page }) => {
    await page.goto('/historial?nuevo=1');
    const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });

    await dialog.getByLabel('Importe').fill('-5');
    await dialog.getByRole('button', { name: 'Registrar' }).click();

    await expect(dialog.getByLabel('Importe')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('Elige una categoría.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('solo ofrece categorías del tipo elegido', async ({ page }) => {
    await page.goto('/historial?nuevo=1');
    const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
    const category = dialog.getByLabel('Categoría');

    await expect(category.getByRole('option', { name: 'Alimentación' })).toBeAttached();
    await dialog.getByText('Ingreso', { exact: true }).click();
    await expect(category.getByRole('option', { name: 'Alimentación' })).not.toBeAttached();
    await expect(category.getByRole('option', { name: 'Salario' })).toBeAttached();
  });

  test('edita y elimina un movimiento', async ({ page }) => {
    await createMovementsViaApi(page, [
      { type: 'EXPENSE', amount: '45', description: 'Taxi', category: 'Transporte' },
    ]);
    await page.goto('/historial');
    const table = page.getByRole('table', { name: 'Movimientos' });

    await table.getByRole('button', { name: 'Editar Taxi' }).click();
    const form = page.getByRole('dialog', { name: 'Editar movimiento' });
    await expect(form.getByLabel('Importe')).toHaveValue('45.00');
    await form.getByLabel('Importe').fill('52.30');
    await form.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(table.getByRole('row', { name: /Taxi/ })).toContainText(/52\.30/);

    await table.getByRole('button', { name: 'Eliminar Taxi' }).click();
    const confirm = page.getByRole('dialog', { name: '¿Eliminar este movimiento?' });
    await expect(confirm.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await confirm.getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.getByText('Aún no hay movimientos')).toBeVisible();
  });

  test('filtra por tipo y busca por descripción; los filtros quedan en la URL', async ({
    page,
  }) => {
    await createMovementsViaApi(page, [
      { type: 'INCOME', amount: '3000', description: 'Sueldo', category: 'Salario' },
      {
        type: 'EXPENSE',
        amount: '120',
        description: 'Supermercado Plaza',
        category: 'Alimentación',
      },
      { type: 'EXPENSE', amount: '35', description: 'Super del barrio', category: 'Alimentación' },
      { type: 'EXPENSE', amount: '800', description: 'Alquiler', category: 'Vivienda' },
    ]);
    await page.goto('/historial');
    const rows = page.getByRole('table', { name: 'Movimientos' }).getByRole('row');
    await expect(rows).toHaveCount(5);

    await page.getByText('Gastos', { exact: true }).click();
    await expect(rows).toHaveCount(4);
    await expect(page).toHaveURL(/type=EXPENSE/);

    await page.getByLabel('Buscar').fill('super');
    await expect(rows).toHaveCount(3);
    await expect(page).toHaveURL(/q=super/);

    // Recargar conserva los filtros.
    await page.reload();
    await expect(rows).toHaveCount(3);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(rows).toHaveCount(5);
  });

  test('pagina de 10 en 10', async ({ page }) => {
    await createMovementsViaApi(
      page,
      Array.from({ length: 12 }, (_, i) => ({
        type: 'EXPENSE' as const,
        amount: String(i + 1),
        description: `Gasto ${i + 1}`,
        category: 'Otros gastos',
        date: today(),
      })),
    );
    await page.goto('/historial');

    await expect(page.getByText('Mostrando 1–10 de 12')).toBeVisible();
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.getByText('Mostrando 11–12 de 12')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
  });
});
