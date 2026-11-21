import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@simplify/shared';
import { issueCsrfToken } from '../../middlewares/csrf.js';
import type { AuthService } from './auth.service.js';
import { clearSessionCookies, REFRESH_COOKIE, setSessionCookies } from './cookies.js';
import type { SessionService } from './session.service.js';

/** Capa Controller: traduce HTTP ↔ servicios. Recibe datos ya validados por el middleware `validate`. */
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly secureCookies: boolean,
  ) {}

  /** RF-01: crea la cuenta e inicia la sesión. */
  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.register(req.validated?.body as RegisterInput);
    const tokens = await this.sessions.start(user.id, req.get('user-agent'));
    setSessionCookies(res, tokens, this.secureCookies);
    res.status(201).json({ user });
  };

  /** Entrega el token CSRF que el frontend debe enviar en la cabecera X-CSRF-Token. */
  csrf = (req: Request, res: Response): void => {
    const token = issueCsrfToken(req.cookies?.simplify_csrf, res, this.secureCookies);
    res.set('Cache-Control', 'no-store').json({ csrfToken: token });
  };

  /** RF-02 */
  login = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.login(req.validated?.body as LoginInput, req.ip ?? 'desconocida');
    const tokens = await this.sessions.start(user.id, req.get('user-agent'));
    setSessionCookies(res, tokens, this.secureCookies);
    res.json({ user });
  };

  /** Renueva la sesión con el token de renovación (lo llama el frontend cuando el de acceso vence). */
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokens } = await this.sessions.rotate(
        cookie(req, REFRESH_COOKIE),
        req.get('user-agent'),
      );
      setSessionCookies(res, tokens, this.secureCookies);
      res.status(204).end();
    } catch (err) {
      clearSessionCookies(res, this.secureCookies);
      throw err;
    }
  };

  /** RF-03 */
  logout = async (req: Request, res: Response): Promise<void> => {
    await this.sessions.end(cookie(req, REFRESH_COOKIE));
    clearSessionCookies(res, this.secureCookies);
    res.status(204).end();
  };

  /** Perfil del usuario autenticado (`requireAuth` ya dejó `req.userId`). */
  me = async (req: Request, res: Response): Promise<void> => {
    res.json({ user: await this.auth.getProfile(req.userId!) });
  };

  /** RF-04, RF-18: el id sale de la sesión, nunca del cuerpo de la petición. */
  updateMe = async (req: Request, res: Response): Promise<void> => {
    const input = req.validated?.body as UpdateProfileInput;
    res.json({ user: await this.auth.updateProfile(req.userId!, input) });
  };
}

function cookie(req: Request, name: string): string | undefined {
  const value: unknown = req.cookies?.[name];
  return typeof value === 'string' ? value : undefined;
}
