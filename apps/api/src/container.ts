import type { Env } from './config/env.js';
import type { PasswordHasher } from './lib/password.js';
import { requireAuth } from './middlewares/require-auth.js';
import { AuthController } from './modules/auth/auth.controller.js';
import type { UserRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { LoginAttemptRepository } from './modules/auth/login-attempt.repository.js';
import { LoginThrottleService } from './modules/auth/login-throttle.service.js';
import type { RefreshTokenRepository } from './modules/auth/refresh-token.repository.js';
import { SessionService } from './modules/auth/session.service.js';
import { TokenService } from './modules/auth/token.service.js';
import { CategoryController } from './modules/categories/category.controller.js';
import type { CategoryRepository } from './modules/categories/category.repository.js';
import { CategoryService } from './modules/categories/category.service.js';
import { MovementController } from './modules/movements/movement.controller.js';
import type { MovementRepository } from './modules/movements/movement.repository.js';
import { MovementService } from './modules/movements/movement.service.js';
import { SummaryController } from './modules/summary/summary.controller.js';
import type { SummaryRepository } from './modules/summary/summary.repository.js';
import { SummaryService } from './modules/summary/summary.service.js';
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
    loginAttempts: LoginAttemptRepository;
    categories: CategoryRepository;
    movements: MovementRepository;
    summaries: SummaryRepository;
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
  const throttle = new LoginThrottleService(deps.repositories.loginAttempts, now);
  const auth = new AuthService(deps.repositories.users, deps.passwordHasher, throttle);

  return {
    health: new HealthController(new HealthService(deps.database)),
    auth: new AuthController(auth, sessions, config.NODE_ENV === 'production'),
    categories: new CategoryController(new CategoryService(deps.repositories.categories)),
    movements: new MovementController(
      new MovementService(deps.repositories.movements, deps.repositories.categories),
    ),
    summaries: new SummaryController(new SummaryService(deps.repositories.summaries)),
    requireAuth: requireAuth(tokens),
  };
}

export type Controllers = ReturnType<typeof buildControllers>;
