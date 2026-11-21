import { Router, type RequestHandler } from 'express';
import { loginSchema, registerSchema } from '@simplify/shared';
import { validate } from '../../middlewares/validate.js';
import type { AuthController } from './auth.controller.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.get('/csrf', controller.csrf);
  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  return router;
}

/** Rutas del usuario autenticado. `requireAuth` protege todo el router. */
export function createMeRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', controller.me);
  return router;
}
