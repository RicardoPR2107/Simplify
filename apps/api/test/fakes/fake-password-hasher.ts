import type { PasswordHasher } from '../../src/lib/password.js';

/** Hasher rápido y predecible para pruebas que no necesitan Argon2 real. */
export const fakePasswordHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  verify: async (passwordHash, password) => passwordHash === `hashed:${password}`,
};
