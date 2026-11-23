import type { PrismaClient } from '../../generated/prisma/client.js';

export interface FailureSummary {
  count: number;
  /** Fecha del fallo más antiguo dentro de la ventana (para calcular cuánto falta para desbloquear). */
  oldest: Date | null;
}

export interface LoginAttemptRepository {
  record(key: string, succeeded: boolean, at: Date): Promise<void>;
  lastSuccessAt(key: string): Promise<Date | null>;
  failuresSince(key: string, since: Date): Promise<FailureSummary>;
}

export class PrismaLoginAttemptRepository implements LoginAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(key: string, succeeded: boolean, at: Date): Promise<void> {
    await this.prisma.loginAttempt.create({ data: { key, succeeded, createdAt: at } });
  }

  async lastSuccessAt(key: string): Promise<Date | null> {
    const last = await this.prisma.loginAttempt.findFirst({
      where: { key, succeeded: true },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return last?.createdAt ?? null;
  }

  async failuresSince(key: string, since: Date): Promise<FailureSummary> {
    const result = await this.prisma.loginAttempt.aggregate({
      where: { key, succeeded: false, createdAt: { gt: since } },
      _count: { _all: true },
      _min: { createdAt: true },
    });
    return { count: result._count._all, oldest: result._min.createdAt };
  }
}
