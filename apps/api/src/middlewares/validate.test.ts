import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createMovementSchema } from '@simplify/shared';
import { errorHandler } from './error-handler.js';
import { validate } from './validate.js';

function appWithValidatedRoute() {
  const app = express();
  app.use(express.json());
  app.post('/movimientos', validate({ body: createMovementSchema }), (req, res) => {
    res.status(201).json(req.validated?.body);
  });
  app.use(errorHandler);
  return app;
}

const valid = {
  type: 'EXPENSE',
  description: '  Supermercado  ',
  amount: '85.50',
  categoryId: '7f1c2b8e-4b1a-4c2e-9a3d-2f6e8b9c0d11',
  date: '2026-11-15',
};

describe('middleware validate', () => {
  it('deja pasar datos válidos ya normalizados', async () => {
    const res = await request(appWithValidatedRoute()).post('/movimientos').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Supermercado');
  });

  it('corta la petición con 400 y errores por campo si los datos no son válidos', async () => {
    const res = await request(appWithValidatedRoute())
      .post('/movimientos')
      .send({ ...valid, amount: '-10' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields.amount).toBeDefined();
  });
});
