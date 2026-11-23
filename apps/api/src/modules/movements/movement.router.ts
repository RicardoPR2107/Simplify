import { Router, type RequestHandler } from 'express';
import {
  createMovementSchema,
  idParamSchema,
  listMovementsQuerySchema,
  updateMovementSchema,
} from '@simplify/shared';
import { validate } from '../../middlewares/validate.js';
import type { MovementController } from './movement.controller.js';

export function createMovementRouter(
  controller: MovementController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', validate({ query: listMovementsQuerySchema }), controller.list);
  router.post('/', validate({ body: createMovementSchema }), controller.create);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateMovementSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);
  return router;
}
