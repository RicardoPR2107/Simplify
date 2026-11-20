import { Router } from 'express';
import { registerSchema } from '@simplify/shared';
import { validate } from '../../middlewares/validate.js';
import type { AuthController } from './auth.controller.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post('/register', validate({ body: registerSchema }), controller.register);
  return router;
}
