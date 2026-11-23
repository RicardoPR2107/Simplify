import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createMovementsViaApi, registerViaApi } from './helpers';

/** Analiza la página con axe-core usando las reglas WCAG 2.1 nivel A y AA. */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `Problemas de accesibilidad en ${page.url()}`).toEqual([]);
}

test.describe('Accesibilidad (WCAG 2.1 AA)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
      test.use({ colorScheme: theme });

      test('pantallas públicas', async ({ page }) => {
        for (const path of ['/iniciar-sesion', '/registro']) {
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expectNoViolations(page);
        }
      });

      test('pantallas de la aplicación con datos', async ({ page }) => {
        await registerViaApi(page);
        await createMovementsViaApi(page, [
          { type: 'INCOME', amount: '2500', description: 'Sueldo', category: 'Salario' },
          { type: 'EXPENSE', amount: '640', description: 'Alquiler', category: 'Vivienda' },
          { type: 'EXPENSE', amount: '180.40', description: 'Mercado', category: 'Alimentación' },
        ]);
        for (const path of ['/', '/historial', '/categorias', '/estadisticas', '/configuracion']) {
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expectNoViolations(page);
        }
      });

      test('formulario con errores y diálogo abiertos', async ({ page }) => {
        await registerViaApi(page);
        await page.goto('/historial?nuevo=1');
        const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' });
        await dialog.getByRole('button', { name: 'Registrar' }).click();
        await expect(dialog.getByText('Elige una categoría.')).toBeVisible();
        await expectNoViolations(page);
      });
    });
  }
});
