import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
/** Misma regla que playwright.config.ts: E2E_DATABASE_URL o la base de pruebas de Docker. */
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  (process.env.CI
    ? 'postgresql://simplify:simplify_test@localhost:5432/simplify_e2e'
    : 'postgresql://simplify:simplify_test@localhost:5433/simplify_e2e');

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../api/prisma/migrations',
);

/**
 * Prepara la base de las pruebas E2E: crea `simplify_e2e` si no existe, la vacía y aplica
 * las migraciones reales, así cada ejecución empieza desde cero.
 *
 * Se ejecuta justo antes de arrancar la API de pruebas (ver playwright.config.ts), porque
 * Playwright levanta los servidores antes que cualquier otra preparación.
 */
async function prepareDatabase(): Promise<void> {
  const target = new URL(E2E_DATABASE_URL);
  const database = target.pathname.slice(1);

  // 1. Conexión a la base "postgres" del mismo servidor para poder crear la de E2E.
  const adminUrl = new URL(target);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${target.host}. ¿Está abierto Docker Desktop y ejecutaste \`npm run db:up\`?`,
      { cause: err },
    );
  }
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }

  // 2. Esquema limpio + migraciones en orden.
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    const migrations = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of migrations) {
      await client.query(await readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }
  process.stdout.write(`Base de datos E2E lista: ${database}\n`);
}

await prepareDatabase();
