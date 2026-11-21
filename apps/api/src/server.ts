import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { argon2Hasher } from './lib/password.js';
import { createPrismaClient } from './lib/prisma.js';
import { PrismaUserRepository } from './modules/auth/auth.repository.js';
import { PrismaLoginAttemptRepository } from './modules/auth/login-attempt.repository.js';
import { PrismaRefreshTokenRepository } from './modules/auth/refresh-token.repository.js';

const env = loadEnv();
const logger = createLogger(env);
const prisma = createPrismaClient(env.DATABASE_URL);

const app = createApp({
  env,
  logger,
  deps: {
    database: {
      ping: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return true;
        } catch (err) {
          // Registrar la causa real: sin esto, /health/ready solo diría "down" sin explicar por qué.
          logger.warn({ err }, 'No se pudo conectar a PostgreSQL');
          throw err;
        }
      },
    },
    repositories: {
      users: new PrismaUserRepository(prisma),
      refreshTokens: new PrismaRefreshTokenRepository(prisma),
      loginAttempts: new PrismaLoginAttemptRepository(prisma),
    },
    passwordHasher: argon2Hasher,
  },
});

const server = app.listen(env.PORT, () => {
  logger.info(`API de Simplify escuchando en http://localhost:${env.PORT}`);
});

/** Apagado ordenado: deja terminar las peticiones en curso y cierra la conexión a la base de datos. */
function shutdown(signal: string): void {
  logger.info(`${signal} recibido, cerrando...`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
