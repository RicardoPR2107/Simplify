# Simplify

Aplicación web de finanzas personales para **registrar, organizar y analizar ingresos y gastos**. Proyecto de portafolio Full Stack + QA.

**Stack:** TypeScript · React · Node.js · Express · PostgreSQL · Prisma · Zod · Vitest · Playwright · Docker · Nginx · GitHub Actions

> Estado: **Fase 0 completada** (diseño del sistema y repositorio). Ver la hoja de ruta del proyecto.

## Requisitos

| Herramienta                                                       | Versión             | Para qué                 |
| ----------------------------------------------------------------- | ------------------- | ------------------------ |
| [Node.js](https://nodejs.org)                                     | 24 LTS (o 22.22.2+) | Ejecutar web y API       |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | reciente            | Base de datos PostgreSQL |
| [Git](https://git-scm.com)                                        | reciente            | Control de versiones     |

## Puesta en marcha (Windows, macOS o Linux)

```bash
# 1. Instalar dependencias (genera también el cliente de Prisma)
npm install

# 2. Variables de entorno de la API
#    Windows (PowerShell): Copy-Item apps/api/.env.example apps/api/.env
cp apps/api/.env.example apps/api/.env

# 3. Levantar PostgreSQL (desarrollo en :5434 y pruebas en :5433)
npm run db:up

# 4. Arrancar paquete compartido, API y web a la vez
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1/health/live

## Scripts

| Comando                     | Qué hace                                           |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`               | Paquete compartido en modo observación + API + web |
| `npm test`                  | Todas las pruebas (shared, API, web)               |
| `npm run lint`              | ESLint en todo el monorepo                         |
| `npm run typecheck`         | Comprobación de tipos en todos los paquetes        |
| `npm run build`             | Compila shared, API y web                          |
| `npm run format`            | Formatea el código con Prettier                    |
| `npm run db:up` / `db:down` | Enciende o apaga las bases de datos en Docker      |

## Estructura

```
apps/api         API REST en capas: Router → Controller → Service → Repository
apps/web         React con carga perezosa por ruta, tema claro/oscuro y estados de carga/error
packages/shared  Esquemas Zod y códigos de error usados por la API y la web
docs/            Arquitectura, modelo de datos, ADRs y contrato OpenAPI
```

## Documentación técnica

- [Arquitectura](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Contrato de la API (OpenAPI)](docs/api/openapi.yaml)
- Decisiones de arquitectura (ADR):
  [0001 Monorepo](docs/adr/0001-monorepo.md) ·
  [0002 Sesión con JWT en cookies](docs/adr/0002-sesion-jwt-cookies.md) ·
  [0003 El dinero nunca es un number](docs/adr/0003-dinero-decimal.md) ·
  [0004 Límite de intentos sin Redis](docs/adr/0004-limite-intentos-sin-redis.md)

## Calidad

Cada cambio pasa por:

1. **Antes del commit** (Husky + lint-staged): ESLint y Prettier sobre los archivos modificados.
2. **En cada push** (GitHub Actions): lint, tipos, pruebas con PostgreSQL real y compilación.
