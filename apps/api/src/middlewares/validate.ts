import type { RequestHandler } from 'express';
import type { z } from 'zod';

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Middleware de validación reutilizable (patrón Cadena de responsabilidad):
 * si los datos no cumplen el esquema, la petición se corta aquí y nunca llega al controlador.
 * Los datos ya validados (y normalizados) quedan en `req.validated`.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    req.validated = {
      body: schemas.body ? schemas.body.parse(req.body) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
    };
    next();
  };
}
