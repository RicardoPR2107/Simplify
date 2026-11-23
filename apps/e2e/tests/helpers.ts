import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Clave#Segura123';

/** Correo único por prueba: las pruebas corren en paralelo sobre la misma base de datos. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria de las pruebas (America/Lima). */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

async function csrfHeader(page: Page): Promise<Record<string, string>> {
  const response = await page.request.get('/api/v1/auth/csrf');
  const { csrfToken } = (await response.json()) as { csrfToken: string };
  return { 'X-CSRF-Token': csrfToken };
}

/**
 * Crea una cuenta directamente con la API (más rápido que por la interfaz) y deja la sesión
 * iniciada en el navegador: `page.request` comparte las cookies con la página.
 * Se usa en las pruebas que no tratan sobre el registro en sí.
 */
export async function registerViaApi(page: Page, name = 'Ricardo Palma') {
  const email = uniqueEmail();
  const response = await page.request.post('/api/v1/auth/register', {
    headers: await csrfHeader(page),
    data: { name, email, password: PASSWORD },
  });
  expect(response.status()).toBe(201);
  return { email, password: PASSWORD, name };
}

interface NewMovement {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  category: string;
  date?: string;
}

/** Prepara datos con la API para las pruebas que se centran en otra cosa (filtros, dashboard…). */
export async function createMovementsViaApi(page: Page, movements: NewMovement[]) {
  const headers = await csrfHeader(page);
  const { categories } = (await (await page.request.get('/api/v1/categories')).json()) as {
    categories: Array<{ id: string; name: string }>;
  };
  for (const movement of movements) {
    const category = categories.find((c) => c.name === movement.category);
    if (!category) throw new Error(`No existe la categoría ${movement.category}`);
    const response = await page.request.post('/api/v1/movements', {
      headers,
      data: {
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
        categoryId: category.id,
        date: movement.date ?? today(),
      },
    });
    expect(response.status()).toBe(201);
  }
}
