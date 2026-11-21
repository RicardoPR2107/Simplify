import { argon2Hasher } from '../../src/lib/password.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaUserRepository } from '../../src/modules/auth/auth.repository.js';
import { PrismaLoginAttemptRepository } from '../../src/modules/auth/login-attempt.repository.js';
import { PrismaRefreshTokenRepository } from '../../src/modules/auth/refresh-token.repository.js';
import { PrismaCategoryRepository } from '../../src/modules/categories/category.repository.js';
import { buildTestApp } from '../helpers.js';

/** App con los repositorios reales de Prisma y Argon2id, como en producción. */
export function buildIntegrationApp(prisma: PrismaClient) {
  return buildTestApp({
    repositories: {
      users: new PrismaUserRepository(prisma),
      refreshTokens: new PrismaRefreshTokenRepository(prisma),
      loginAttempts: new PrismaLoginAttemptRepository(prisma),
      categories: new PrismaCategoryRepository(prisma),
    },
    passwordHasher: argon2Hasher,
  });
}
