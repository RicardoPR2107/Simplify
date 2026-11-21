import type { Request, Response } from 'express';
import type {
  CreateMovementInput,
  ListMovementsQuery,
  UpdateMovementInput,
} from '@simplify/shared';
import type { MovementService } from './movement.service.js';

interface IdParams {
  id: string;
}

export class MovementController {
  constructor(private readonly movements: MovementService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.movements.list(req.userId!, req.validated?.query as ListMovementsQuery));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as IdParams;
    res.json({ movement: await this.movements.get(req.userId!, id) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = req.validated?.body as CreateMovementInput;
    res.status(201).json({ movement: await this.movements.create(req.userId!, input) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as IdParams;
    const input = req.validated?.body as UpdateMovementInput;
    res.json({ movement: await this.movements.update(req.userId!, id, input) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as IdParams;
    await this.movements.delete(req.userId!, id);
    res.status(204).end();
  };
}
