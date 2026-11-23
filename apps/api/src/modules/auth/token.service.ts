import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

/** Duración del token de acceso: corta, para limitar el daño si alguien lo roba. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Duración del token de renovación: permite mantener la sesión 7 días sin volver a escribir la contraseña. */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const ISSUER = 'simplify-api';

/** Firma y verifica los tokens de acceso (JWT). Se inyecta para poder controlar el reloj en pruebas. */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  /** JWT firmado con HMAC-SHA256 que solo contiene el id del usuario (`sub`). */
  signAccessToken(userId: string): Promise<string> {
    const issuedAt = Math.floor(this.now().getTime() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ACCESS_TOKEN_TTL_SECONDS)
      .sign(this.key);
  }

  /** Devuelve el id del usuario si el token es auténtico y no venció; si no, `null`. */
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        algorithms: ['HS256'],
        currentDate: this.now(),
      });
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}

/** Token de renovación: 256 bits aleatorios. No es un JWT: su validez la decide la base de datos. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * En la base de datos solo se guarda el hash SHA-256 del token de renovación.
 * Si alguien leyera la tabla, no podría usar los tokens. SHA-256 basta (no hace falta Argon2)
 * porque el token es aleatorio y largo: no se puede adivinar probando contraseñas comunes.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
