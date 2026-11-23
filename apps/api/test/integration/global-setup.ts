import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { testDatabaseUrl } from './database.js';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../prisma/migrations',
);

/**
 * Se ejecuta una vez antes de las pruebas de integración:
 * borra el esquema de la base de pruebas y aplica todas las migraciones en orden.
 * Así cada ejecución empieza desde cero y prueba exactamente el SQL que irá a producción.
 */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  const client = new pg.Client({ connectionString: url });

  try {
    await client.connect();
  } catch (err) {
    const target = new URL(url);
    throw new Error(
      `No se pudo conectar a la base de datos de pruebas (${target.host}). ` +
        '¿Está abierto Docker Desktop y ejecutaste `npm run db:up`?',
      { cause: err },
    );
  }

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    const migrations = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of migrations) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
