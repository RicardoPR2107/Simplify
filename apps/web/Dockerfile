# syntax=docker/dockerfile:1

# Imagen del frontend servido por Nginx, que además reparte las peticiones /api entre las
# instancias de la API (balanceo de carga). Se construye desde la raíz del repositorio:
#   docker build -f apps/web/Dockerfile .

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/e2e/package.json apps/e2e/
RUN npm ci --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @simplify/shared && npm run build -w @simplify/web

# ---------- runtime ----------
FROM nginx:stable-alpine AS runtime

# Configuración propia en lugar de la que trae la imagen.
RUN rm /etc/nginx/conf.d/default.conf
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/simplify.conf
COPY infra/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health > /dev/null || exit 1
