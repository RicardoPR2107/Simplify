import type { Env } from './config/env.js';
import type { PasswordHasher } from './lib/password.js';
import { requireAuth } from './middlewares/require-auth.js';
import { AuthController } from './modules/auth/auth.controller.js';
import type { UserRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { RefreshTokenRepository } from './modules/auth/refresh-token.repository.js';
import { SessionService } from './modules/auth/session.service.js';
import { TokenService } from './modules/auth/token.service.js';
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
    refreshTokens: RefreshTokenRepository;
  };
  passwordHasher: PasswordHasher;
  /** Reloj inyectable: las pruebas lo adelantan para comprobar vencimientos. */
  now?: () => Date;
}

export type AppConfig = Pick<Env, 'NODE_ENV' | 'CORS_ORIGIN' | 'JWT_SECRET'>;

export function buildControllers(deps: Dependencies, config: AppConfig) {
  const now = deps.now ?? (() => new Date());
  const tokens = new TokenService(config.JWT_SECRET, now);
  const sessions = new SessionService(deps.repositories.refreshTokens, tokens, now);
  const auth = new AuthService(deps.repositories.users, deps.passwordHasher);

  return {
    health: new HealthController(new HealthService(deps.database)),
    auth: new AuthController(auth, sessions, config.NODE_ENV === 'production'),
    requireAuth: requireAuth(tokens),
  };
}

export type Controllers = ReturnType<typeof buildControllers>;
