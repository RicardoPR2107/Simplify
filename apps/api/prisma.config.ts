import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` no necesita conexión; el valor por defecto solo evita que falle sin .env.
    url: process.env.DATABASE_URL ?? 'postgresql://simplify:simplify_dev@localhost:5434/simplify',
  },
});
