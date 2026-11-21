import type {
  FailureSummary,
  LoginAttemptRepository,
} from '../../src/modules/auth/login-attempt.repository.js';

/** Doble de prueba del registro de intentos de inicio de sesión, en memoria. */
export class InMemoryLoginAttemptRepository implements LoginAttemptRepository {
  readonly attempts: Array<{ key: string; succeeded: boolean; at: Date }> = [];

  async record(key: string, succeeded: boolean, at: Date): Promise<void> {
    this.attempts.push({ key, succeeded, at });
  }

  async lastSuccessAt(key: string): Promise<Date | null> {
    const dates = this.attempts.filter((a) => a.key === key && a.succeeded).map((a) => a.at);
    return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  }

  async failuresSince(key: string, since: Date): Promise<FailureSummary> {
    const dates = this.attempts
      .filter((a) => a.key === key && !a.succeeded && a.at > since)
      .map((a) => a.at.getTime());
    return { count: dates.length, oldest: dates.length ? new Date(Math.min(...dates)) : null };
  }
}
