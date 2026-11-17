import type { DatabaseProbe } from './modules/health/health.service.js';
import { HealthService } from './modules/health/health.service.js';
import { HealthController } from './modules/health/health.controller.js';

/**
 * Raíz de composición (inyección de dependencias manual).
 * Aquí, y solo aquí, se crean las instancias y se conectan entre sí:
 * Repository → Service → Controller. En las pruebas se pasan dependencias simuladas.
 */
export interface Dependencies {
  database: DatabaseProbe;
}

export function buildControllers(deps: Dependencies) {
  return {
    health: new HealthController(new HealthService(deps.database)),
  };
}

export type Controllers = ReturnType<typeof buildControllers>;
