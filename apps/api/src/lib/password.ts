import { hash, verify } from '@node-rs/argon2';

/** Convierte contraseñas en hashes irreversibles y los comprueba. Se inyecta para poder simularlo en pruebas. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

/**
 * Argon2id con los parámetros mínimos recomendados por OWASP (19 MiB de memoria, 2 iteraciones).
 * Argon2id es el algoritmo recomendado hoy para contraseñas: es lento a propósito y consume memoria,
 * lo que encarece mucho los ataques de fuerza bruta con tarjetas gráficas.
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, OPTIONS),
  verify: async (passwordHash, password) => {
    try {
      return await verify(passwordHash, password);
    } catch {
      // Un hash con formato inválido nunca coincide.
      return false;
    }
  },
};
