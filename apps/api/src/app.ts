import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { buildControllers, type AppConfig, type Dependencies } from './container.js';
import { csrfProtection } from './middlewares/csrf.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { createAuthRouter, createMeRouter } from './modules/auth/auth.router.js';
import { createCategoryRouter } from './modules/categories/category.router.js';
import { createMovementRouter } from './modules/movements/movement.router.js';
import { createHealthRouter } from './modules/health/health.router.js';

export interface AppOptions {
  env: AppConfig;
  logger: Logger;
  deps: Dependencies;
}

/**
 * Construye la aplicación Express sin arrancar el servidor.
 * Separarlo de server.ts permite probarla con Supertest sin abrir puertos.
 */
export function createApp({ env, logger, deps }: AppOptions): Express {
  const app = express();
  const controllers = buildControllers(deps, env);

  // Detrás de Nginx (Fase 6): confía en el primer proxy para leer la IP real del cliente.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Seguridad: cabeceras HTTP de protección y CORS limitado al frontend.
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    }),
  );

  // 2. Trazabilidad: cada petición recibe un id que aparece en logs y respuestas de error.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );

  // 3. Lectura del cuerpo con límite de tamaño (evita peticiones gigantes).
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // 4. CSRF: toda petición que modifica datos debe traer el token en la cabecera X-CSRF-Token.
  app.use('/api/v1', csrfProtection());

  // 5. Rutas versionadas.
  app.use('/api/v1/health', createHealthRouter(controllers.health));
  app.use('/api/v1/auth', createAuthRouter(controllers.auth));
  app.use('/api/v1/me', createMeRouter(controllers.auth, controllers.requireAuth));
  app.use(
    '/api/v1/categories',
    createCategoryRouter(controllers.categories, controllers.requireAuth),
  );
  app.use(
    '/api/v1/movements',
    createMovementRouter(controllers.movements, controllers.requireAuth),
  );

  // 6. Errores: siempre al final.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
