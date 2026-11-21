import { describe, expect, it } from 'vitest';
import { InMemoryLoginAttemptRepository } from '../../../test/fakes/in-memory-login-attempt.repository.js';
import {
  LOGIN_WINDOW_MS,
  LoginThrottleService,
  MAX_FAILURES_PER_EMAIL,
  MAX_FAILURES_PER_IP,
} from './login-throttle.service.js';

function setup() {
  let now = new Date('2026-11-20T10:00:00Z');
  const repo = new InMemoryLoginAttemptRepository();
  const throttle = new LoginThrottleService(repo, () => now);
  return {
    repo,
    throttle,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

async function fail(throttle: LoginThrottleService, times: number, email: string, ip: string) {
  for (let i = 0; i < times; i++) await throttle.recordFailure(email, ip);
}

describe('LoginThrottleService', () => {
  it(`permite hasta ${MAX_FAILURES_PER_EMAIL - 1} fallos y bloquea al llegar a ${MAX_FAILURES_PER_EMAIL}`, async () => {
    const { throttle } = setup();
    await fail(throttle, MAX_FAILURES_PER_EMAIL - 1, 'a@x.com', '1.1.1.1');
    await expect(throttle.assertAllowed('a@x.com', '1.1.1.1')).resolves.toBeUndefined();

    await fail(throttle, 1, 'a@x.com', '1.1.1.1');
    await expect(throttle.assertAllowed('a@x.com', '1.1.1.1')).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
      status: 429,
    });
  });

  it('el bloqueo por correo aplica aunque el atacante cambie de IP', async () => {
    const { throttle } = setup();
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      await throttle.recordFailure('a@x.com', `10.0.0.${i}`);
    }
    await expect(throttle.assertAllowed('a@x.com', '10.0.0.99')).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });
  });

  it('bloquea una IP que prueba muchos correos distintos', async () => {
    const { throttle } = setup();
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) {
      await throttle.recordFailure(`user${i}@x.com`, '2.2.2.2');
    }
    await expect(throttle.assertAllowed('nuevo@x.com', '2.2.2.2')).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });
  });

  it('indica en cuántos segundos se desbloquea y se desbloquea al pasar la ventana', async () => {
    const { throttle, advance } = setup();
    await fail(throttle, MAX_FAILURES_PER_EMAIL, 'a@x.com', '1.1.1.1');
    advance(5 * 60 * 1000);

    await expect(throttle.assertAllowed('a@x.com', '1.1.1.1')).rejects.toMatchObject({
      retryAfterSeconds: 10 * 60,
    });
    advance(LOGIN_WINDOW_MS);
    await expect(throttle.assertAllowed('a@x.com', '1.1.1.1')).resolves.toBeUndefined();
  });

  it('un inicio de sesión correcto reinicia el contador del correo', async () => {
    const { throttle, advance } = setup();
    await fail(throttle, MAX_FAILURES_PER_EMAIL - 1, 'a@x.com', '1.1.1.1');
    advance(1000);
    await throttle.recordSuccess('a@x.com', '1.1.1.1');
    advance(1000);
    await fail(throttle, MAX_FAILURES_PER_EMAIL - 1, 'a@x.com', '1.1.1.1');

    await expect(throttle.assertAllowed('a@x.com', '1.1.1.1')).resolves.toBeUndefined();
  });

  it('no guarda correos ni IP en claro', async () => {
    const { throttle, repo } = setup();
    await throttle.recordFailure('a@x.com', '1.1.1.1');
    for (const attempt of repo.attempts) {
      expect(attempt.key).toMatch(/^[0-9a-f]{64}$/);
      expect(attempt.key).not.toContain('a@x.com');
    }
  });
});
