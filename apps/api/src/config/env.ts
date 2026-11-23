import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar. Si falta alguna o tiene un valor inválido,
 * la API no arranca y dice exactamente qué corregir (mejor que fallar a mitad de una petición).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url({ error: 'DATABASE_URL debe ser una URL de PostgreSQL válida.' }),
  CORS_ORIGIN: z.url({ error: 'CORS_ORIGIN debe ser la URL del frontend.' }),
  // Clave para firmar los JWT. Larga y aleatoria; distinta en cada entorno y nunca en el código.
  JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET debe tener al menos 32 caracteres.' }),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración inválida. Revisa tu archivo .env:\n${details}`);
  }
  return result.data;
}
