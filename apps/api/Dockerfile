# syntax=docker/dockerfile:1

# Imagen de la API de Simplify. Se construye desde la raíz del repositorio:
#   docker build -f apps/api/Dockerfile .
# Tiene tres etapas:
#   build    → instala todo y compila TypeScript (se descarta al final).
#   migrate  → aplica las migraciones de la base de datos y termina.
#   runtime  → la imagen final: solo dependencias de producción y el código compilado.

ARG NODE_VERSION=22-alpine

# ---------- build ----------
FROM node:${NODE_VERSION} AS build
# El motor de migraciones de Prisma necesita OpenSSL; Alpine no lo trae por defecto.
RUN apk add --no-cache openssl
WORKDIR /app

# Primero solo los package.json: si no cambian, Docker reutiliza la capa de `npm ci` (builds más rápidos).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/e2e/package.json apps/e2e/
# --ignore-scripts: no ejecuta scripts de instalación de terceros (más seguro y reproducible).
RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @simplify/shared \
 && npm run db:generate -w @simplify/api \
 && npm run build -w @simplify/api

# ---------- migrate ----------
# Usa la imagen de build porque necesita la CLI de Prisma (dependencia de desarrollo).
# Es un trabajo de un solo uso que termina enseguida y no recibe tráfico; corre con el mismo
# usuario que descargó el motor de Prisma durante el build, para no volver a descargarlo.
FROM build AS migrate
WORKDIR /app/apps/api
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/e2e/package.json apps/e2e/
# Solo las dependencias de producción de la API y del paquete compartido. Después se quitan
# los paquetes que npm deja aunque solo sirven en desarrollo (ver infra/prune-dev-deps.mjs).
COPY infra/prune-dev-deps.mjs ./
RUN npm ci --omit=dev --ignore-scripts -w @simplify/api -w @simplify/shared \
 && node prune-dev-deps.mjs \
 && rm prune-dev-deps.mjs \
 && npm cache clean --force

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist

# Nunca como root: si alguien aprovechara un fallo, tendría los mínimos permisos.
USER node
WORKDIR /app/apps/api
EXPOSE 4000

# Docker marca el contenedor como "unhealthy" si el proceso deja de responder.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health/live > /dev/null || exit 1

CMD ["node", "dist/server.js"]
