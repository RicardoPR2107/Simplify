import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashRefreshToken, TokenService } from './token.service.js';

const SECRET = 'clave-de-pruebas-de-al-menos-32-caracteres!!';

describe('TokenService', () => {
  it('firma un token que luego verifica y devuelve el id del usuario', async () => {
    const tokens = new TokenService(SECRET);
    const jwt = await tokens.signAccessToken('user-1');
    expect(await tokens.verifyAccessToken(jwt)).toBe('user-1');
  });

  it('rechaza un token alterado', async () => {
    const tokens = new TokenService(SECRET);
    const jwt = await tokens.signAccessToken('user-1');
    const [header, , signature] = jwt.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'otro-usuario' })).toString(
      'base64url',
    );
    expect(await tokens.verifyAccessToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it('rechaza un token firmado con otra clave', async () => {
    const jwt = await new TokenService(
      'otra-clave-distinta-de-al-menos-32-caracteres',
    ).signAccessToken('user-1');
    expect(await new TokenService(SECRET).verifyAccessToken(jwt)).toBeNull();
  });

  it('rechaza un token vencido (más de 15 minutos)', async () => {
    let now = new Date('2026-11-20T10:00:00Z');
    const tokens = new TokenService(SECRET, () => now);
    const jwt = await tokens.signAccessToken('user-1');

    now = new Date('2026-11-20T10:14:00Z');
    expect(await tokens.verifyAccessToken(jwt)).toBe('user-1');
    now = new Date('2026-11-20T10:16:00Z');
    expect(await tokens.verifyAccessToken(jwt)).toBeNull();
  });

  it('rechaza texto que no es un JWT', async () => {
    expect(await new TokenService(SECRET).verifyAccessToken('no-es-un-token')).toBeNull();
  });
});

describe('Tokens de renovación', () => {
  it('son aleatorios y distintos cada vez', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
    expect(generateRefreshToken().length).toBeGreaterThanOrEqual(43);
  });

  it('el hash es estable y no revela el token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toContain(token);
  });
});
