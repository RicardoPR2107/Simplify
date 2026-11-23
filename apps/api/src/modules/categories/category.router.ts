import { Router, type RequestHandler } from 'express';
import {
  createCategorySchema,
  deleteCategorySchema,
  idParamSchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '@simplify/shared';
import { validate } from '../../middlewares/validate.js';
import type { CategoryController } from './category.controller.js';

export function createCategoryRouter(
  controller: CategoryController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', validate({ query: listCategoriesQuerySchema }), controller.list);
  router.post('/', validate({ body: createCategorySchema }), controller.create);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateCategorySchema }),
    controller.rename,
  );
  router.delete(
    '/:id',
    validate({ params: idParamSchema, query: deleteCategorySchema }),
    controller.delete,
  );
  return router;
}
