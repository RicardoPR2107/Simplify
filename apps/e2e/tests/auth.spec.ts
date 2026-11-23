import { expect, test } from '@playwright/test';
import { PASSWORD, registerViaApi, uniqueEmail } from './helpers';

test.describe('Cuenta y sesión', () => {
  test('crear una cuenta lleva al dashboard vacío con invitación a empezar', async ({ page }) => {
    await page.goto('/registro');

    await page.getByLabel('Nombre').fill('Ricardo Palma');
    await page.getByLabel('Correo electrónico').fill(uniqueEmail('registro'));
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await expect(page.getByRole('list', { name: 'Requisitos de la contraseña' })).not.toContainText(
      '(pendiente)',
    );
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Hola, Ricardo' })).toBeVisible();
    await expect(page.getByText('Empieza registrando tu primer movimiento')).toBeVisible();
  });

  test('no permite registrar dos veces el mismo correo', async ({ page }) => {
    const { email } = await registerViaApi(page);
    await page.context().clearCookies();

    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Otra persona');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Ya existe una cuenta con ese correo.')).toBeVisible();
    await expect(page).toHaveURL('/registro');
  });

  test('una ruta protegida pide iniciar sesión y luego vuelve a ella', async ({ page }) => {
    const { email } = await registerViaApi(page);
    await page.context().clearCookies();

    await page.goto('/categorias');
    await expect(page).toHaveURL(/\/iniciar-sesion\?redirect=%2Fcategorias/);

    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL('/categorias');
    await expect(page.getByRole('heading', { level: 1, name: 'Categorías' })).toBeVisible();
  });

  test('credenciales incorrectas muestran un error sin revelar si el correo existe', async ({
    page,
  }) => {
    const { email } = await registerViaApi(page);
    await page.context().clearCookies();
    await page.goto('/iniciar-sesion');

    for (const target of [email, uniqueEmail('nadie')]) {
      await page.getByLabel('Correo electrónico').fill(target);
      await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta#123');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.getByRole('alert')).toHaveText(
        /El correo o la contraseña no son correctos/,
      );
    }
  });

  test('al cerrar sesión ya no se puede entrar al dashboard ni usar la API', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL('/iniciar-sesion');

    await page.goto('/');
    await expect(page).toHaveURL('/iniciar-sesion');
    // La sesión también está cerrada en el servidor, no solo en la interfaz.
    expect((await page.request.get('/api/v1/me')).status()).toBe(401);
    expect((await page.request.post('/api/v1/auth/refresh')).status()).not.toBe(204);
  });

  test('las cookies de sesión no son accesibles desde JavaScript', async ({ page }) => {
    await registerViaApi(page);
    await page.goto('/');
    const visible = await page.evaluate(() => document.cookie);
    expect(visible).not.toContain('simplify_at');
    expect(visible).not.toContain('simplify_rt');
    // El token CSRF sí debe ser legible: el frontend lo copia en la cabecera.
    expect(visible).toContain('simplify_csrf');
  });
});
