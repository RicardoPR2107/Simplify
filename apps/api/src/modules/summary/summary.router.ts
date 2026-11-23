import { Router, type RequestHandler } from 'express';
import { categorySummaryQuerySchema, periodQuerySchema } from '@simplify/shared';
import { validate } from '../../middlewares/validate.js';
import type { SummaryController } from './summary.controller.js';

export function createSummaryRouter(
  controller: SummaryController,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/month', validate({ query: periodQuerySchema }), controller.month);
  router.get('/categories', validate({ query: categorySummaryQuerySchema }), controller.categories);
  router.get('/evolution', validate({ query: periodQuerySchema }), controller.evolution);
  return router;
}
