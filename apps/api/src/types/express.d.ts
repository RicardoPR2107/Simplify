// Amplía el tipo de la petición de Express con lo que añaden nuestros middlewares.
declare global {
  namespace Express {
    interface Request {
      /** Datos ya validados por el middleware `validate`. */
      validated?: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
      /** Id del usuario autenticado. Lo coloca el middleware de autenticación (Fase 1). */
      userId?: string;
    }
  }
}

export {};
