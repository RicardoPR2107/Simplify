import type { Request, Response } from 'express';
import type { RegisterInput } from '@simplify/shared';
import type { AuthService } from './auth.service.js';

/** Capa Controller: traduce HTTP ↔ servicio. Recibe datos ya validados por el middleware `validate`. */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.register(req.validated?.body as RegisterInput);
    res.status(201).json({ user });
  };
}
