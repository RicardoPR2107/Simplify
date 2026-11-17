import type { Request, Response } from 'express';
import type { HealthService } from './health.service.js';

/** Capa Controller: traduce HTTP ↔ servicio. Sin lógica de negocio. */
export class HealthController {
  constructor(private readonly service: HealthService) {}

  live = (_req: Request, res: Response): void => {
    res.json(this.service.live());
  };

  ready = async (_req: Request, res: Response): Promise<void> => {
    const health = await this.service.ready();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  };
}
