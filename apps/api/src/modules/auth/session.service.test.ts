import { describe, expect, it } from 'vitest';
import { InMemoryRefreshTokenRepository } from '../../../test/fakes/in-memory-refresh-token.repository.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

function setup() {
  let now = new Date('2026-11-20T10:00:00Z');
  const clock = () => now;
  const repo = new InMemoryRefreshTokenRepository();
  const service = new SessionService(
    repo,
    new TokenService('clave-de-pruebas-de-al-menos-32-caracteres!!', clock),
    clock,
  );
  return {
    repo,
    service,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe('SessionService', () => {
  it('guarda solo el hash del token de renovación', async () => {
    const { service, repo } = setup();
    const { refreshToken } = await service.start('user-1');

    expect(repo.tokens).toHaveLength(1);
    expect(repo.tokens[0]!.tokenHash).not.toBe(refreshToken);
  });

  it('rota el token: el anterior queda revocado y se entrega uno nuevo', async () => {
    const { service, repo } = setup();
    const first = await service.start('user-1');
    const { userId, tokens } = await service.rotate(first.refreshToken);

    expect(userId).toBe('user-1');
    expect(tokens.refreshToken).not.toBe(first.refreshToken);
    expect(repo.tokens.filter((t) => t.revokedAt === null)).toHaveLength(1);
  });

  it('si se reutiliza un token ya usado, cierra todas las sesiones del usuario', async () => {
    const { service, repo } = setup();
    const stolen = await service.start('user-1');
    const other = await service.start('user-1');
    await service.rotate(stolen.refreshToken);

    await expect(service.rotate(stolen.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(repo.tokens.every((t) => t.revokedAt !== null)).toBe(true);
    await expect(service.rotate(other.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rechaza un token de renovación vencido (más de 7 días)', async () => {
    const { service, advance } = setup();
    const { refreshToken } = await service.start('user-1');
    advance(7 * DAY + 1000);

    await expect(service.rotate(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rechaza un token inexistente o ausente', async () => {
    const { service } = setup();
    await expect(service.rotate('inventado')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(service.rotate(undefined)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('al cerrar sesión, el token deja de servir', async () => {
    const { service } = setup();
    const { refreshToken } = await service.start('user-1');
    await service.end(refreshToken);

    await expect(service.rotate(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
