import { expect, test } from '@playwright/test';
import { registerViaApi } from './helpers';

// Estas pruebas corren solo en el proyecto "movil" (pantalla de teléfono, toques en vez de clics).
test.describe('Uso en el teléfono @movil', () => {
  test('registra un gasto con la barra inferior y lo ve como tarjeta', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Principal' });
    await nav.getByRole('link', { name: 'Nuevo movimiento' }).tap();

    const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
    await dialog.getByLabel('Importe').fill('18.50');
    await dialog.getByLabel('Descripción').fill('Menú del día');
    await dialog.getByLabel('Categoría').selectOption({ label: 'Alimentación' });
    await dialog.getByRole('button', { name: 'Registrar' }).tap();
    await expect(dialog).toBeHidden();

    // En pantallas pequeñas el historial se muestra como lista de tarjetas, no como tabla.
    const card = page.getByRole('button', { name: /Menú del día/ });
    await expect(card).toBeVisible();
    await expect(page.getByRole('table', { name: 'Movimientos' })).toBeHidden();

    // Tocar la tarjeta abre la edición.
    await card.tap();
    await expect(page.getByRole('dialog', { name: 'Editar movimiento' })).toBeVisible();
  });

  test('ninguna pantalla se desborda a lo ancho', async ({ page }) => {
    await registerViaApi(page);
    for (const path of ['/', '/historial', '/categorias', '/estadisticas', '/configuracion']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `desborde horizontal en ${path}`).toBeLessThanOrEqual(0);
    }
  });
});
