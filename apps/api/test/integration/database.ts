import { createPrismaClient, type PrismaClient } from '../../src/lib/prisma.js';

/**
 * Base de datos SOLO para pruebas (nunca la de desarrollo):
 * - En tu PC: el contenedor `simplify-db-test` (puerto 5433), que levanta `npm run db:up`.
 * - En GitHub Actions (CI=true): el PostgreSQL de servicio del workflow, en DATABASE_URL.
 * Se puede forzar otra con DATABASE_URL_TEST.
 */
export function testDatabaseUrl(): string {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  if (process.env.CI && process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return 'postgresql://simplify:simplify_test@localhost:5433/simplify_test';
}

export function createTestPrisma(): PrismaClient {
  return createPrismaClient(testDatabaseUrl());
}

/** Vacía todas las tablas de negocio entre pruebas (las relaciones se borran en cascada). */
export async function resetData(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users, login_attempts RESTART IDENTITY CASCADE');
}
