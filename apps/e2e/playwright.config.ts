import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo (E2E): un navegador real usa la app completa
 * (web + API + PostgreSQL), igual que lo haría una persona.
 *
 * Usan su propia base de datos (`simplify_e2e`) y sus propios puertos (web 5174, API 4100)
 * para no tocar los datos de desarrollo ni chocar con `npm run dev` si está abierto.
 */
const API_PORT = 4100;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  (process.env.CI
    ? 'postgresql://simplify:simplify_test@localhost:5432/simplify_e2e'
    : 'postgresql://simplify:simplify_test@localhost:5433/simplify_e2e');

// Solo para entornos que ya tienen un Chromium instalado en otra ruta.
const executablePath = process.env.E2E_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Pocos navegadores a la vez: más estable en PCs modestas y en CI.
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Con un Chromium externo puede faltar el grabador de vídeo; en ese caso no se graba.
    video: executablePath ? 'off' : 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, grepInvert: /@movil/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, grep: /@movil/ },
  ],
  webServer: [
    {
      name: 'API',
      cwd: '../api',
      // Primero deja la base de E2E limpia y con las migraciones; después arranca la API.
      command:
        'node --import tsx ../e2e/prepare-db.ts && node --import tsx --conditions=development src/server.ts',
      url: `http://localhost:${API_PORT}/api/v1/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        LOG_LEVEL: 'warn',
        DATABASE_URL: E2E_DATABASE_URL,
        E2E_DATABASE_URL,
        CORS_ORIGIN: WEB_URL,
        JWT_SECRET: 'clave-solo-para-pruebas-e2e-de-al-menos-32-caracteres',
      },
    },
    {
      name: 'Web',
      cwd: '../web',
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
