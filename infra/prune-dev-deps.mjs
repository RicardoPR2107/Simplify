/**
 * Quita de node_modules lo que no hace falta en producción.
 *
 * `npm ci --omit=dev` deja instalados los paquetes que el lockfile marca como `devOptional`:
 * se usan solo en desarrollo, pero otro paquete los declara como dependencia opcional.
 * Es el caso de la CLI de Prisma (con Prisma Studio, React, TypeScript…), que @prisma/client
 * declara como "peer" opcional aunque en producción no se use. Este script los elimina
 * usando el propio lockfile, sin listas a mano.
 *
 * Uso (en la etapa final del Dockerfile): node prune-dev-deps.mjs
 */
import { readFileSync, rmSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
let removed = 0;

for (const [path, info] of Object.entries(lock.packages)) {
  if (!path.includes('node_modules/')) continue;
  if (info.dev || info.devOptional) {
    rmSync(path, { recursive: true, force: true });
    removed++;
  }
}

console.log(`Paquetes de desarrollo eliminados: ${removed}`);
