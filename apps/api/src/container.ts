import type { PasswordHasher } from './lib/password.js';
import { AuthController } from './modules/auth/auth.controller.js';
import type { UserRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { HealthService, type DatabaseProbe } from './modules/health/health.service.js';

/**
 * Raíz de composición (inyección de dependencias manual).
 * Aquí, y solo aquí, se crean las instancias y se conectan entre sí:
 * Repository → Service → Controller. En las pruebas se pasan dependencias simuladas.
 */
export interface Dependencies {
  database: DatabaseProbe;
  repositories: {
    users: UserRepository;
  };
  passwordHasher: PasswordHasher;
}

export function buildControllers(deps: Dependencies) {
  return {
    health: new HealthController(new HealthService(deps.database)),
    auth: new AuthController(new AuthService(deps.repositories.users, deps.passwordHasher)),
  };
}

export type Controllers = ReturnType<typeof buildControllers>;
