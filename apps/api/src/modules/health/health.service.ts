/** Comprueba dependencias externas. Se inyecta para poder simularla en las pruebas. */
export interface DatabaseProbe {
  ping(): Promise<boolean>;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  checks: { database: 'up' | 'down' };
}

export class HealthService {
  constructor(private readonly database: DatabaseProbe) {}

  /** Liveness: el proceso está vivo. No toca la base de datos. */
  live(): Pick<HealthStatus, 'status' | 'uptimeSeconds'> {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  /** Readiness: la instancia puede atender tráfico. El balanceador la saca si responde 503. */
  async ready(): Promise<HealthStatus> {
    const databaseUp = await this.database.ping().catch(() => false);
    return {
      status: databaseUp ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: databaseUp ? 'up' : 'down' },
    };
  }
}
