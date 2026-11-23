import { expect, test } from '@playwright/test';
import { createMovementsViaApi, registerViaApi } from './helpers';

test('cambiar la moneda cambia el símbolo en toda la app sin convertir importes', async ({
  page,
}) => {
  await registerViaApi(page);
  await createMovementsViaApi(page, [
    { type: 'EXPENSE', amount: '100', description: 'Libro', category: 'Educación' },
  ]);

  await page.goto('/configuracion');
  const currency = page.getByRole('region', { name: 'Moneda' });
  await currency.getByLabel('Moneda').selectOption('PEN');
  await expect(currency).toContainText(/Así se verán tus importes: S\/\s?1,250\.50/);
  await currency.getByRole('button', { name: 'Guardar moneda' }).click();
  await expect(page.getByText('Moneda actualizada')).toBeVisible();

  await page.getByRole('link', { name: 'Historial' }).first().click();
  const row = page.getByRole('table', { name: 'Movimientos' }).getByRole('row', { name: /Libro/ });
  await expect(row).toContainText(/−S\/\s?100\.00/);

  // Se guardó en el servidor: sigue igual tras recargar.
  await page.reload();
  await expect(row).toContainText(/S\/\s?100\.00/);
});

test('cambiar el nombre actualiza el saludo', async ({ page }) => {
  await registerViaApi(page, 'Ricardo Palma');
  await page.goto('/configuracion');
  const profile = page.getByRole('region', { name: 'Perfil' });
  await profile.getByLabel('Nombre').fill('Arturo');
  await profile.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Nombre actualizado')).toBeVisible();

  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await expect(page.getByRole('heading', { name: 'Hola, Arturo' })).toBeVisible();
});
