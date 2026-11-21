import { describe, expect, it } from 'vitest';
import { AppError } from '../../errors/app-error.js';
import { fakePasswordHasher } from '../../../test/fakes/fake-password-hasher.js';
import { InMemoryUserRepository } from '../../../test/fakes/in-memory-user.repository.js';
import { AuthService } from './auth.service.js';
import { InMemoryLoginAttemptRepository } from '../../../test/fakes/in-memory-login-attempt.repository.js';
import { LoginThrottleService } from './login-throttle.service.js';

const input = { name: 'Ricardo', email: 'ricardo@example.com', password: 'Clave#Segura123' };

function setup() {
  const users = new InMemoryUserRepository();
  return {
    users,
    service: new AuthService(
      users,
      fakePasswordHasher,
      new LoginThrottleService(new InMemoryLoginAttemptRepository()),
    ),
  };
}

describe('AuthService.register (RF-01)', () => {
  it('crea la cuenta y devuelve solo los datos públicos', async () => {
    const { service } = setup();
    const profile = await service.register(input);

    expect(profile).toEqual({
      id: expect.any(String),
      name: 'Ricardo',
      email: 'ricardo@example.com',
      currency: 'USD',
    });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('guarda el hash de la contraseña, nunca la contraseña en texto plano', async () => {
    const { service, users } = setup();
    await service.register(input);

    const stored = users.users[0]!;
    expect(stored.passwordHash).not.toBe(input.password);
    expect(stored.passwordHash).toBe('hashed:Clave#Segura123');
  });

  it('rechaza un correo ya registrado', async () => {
    const { service } = setup();
    await service.register(input);

    await expect(service.register(input)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
    });
    await expect(service.register(input)).rejects.toBeInstanceOf(AppError);
  });
});
