# ADR 0001 — Monorepo con npm workspaces

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

Simplify tiene un frontend (React) y una API (Express), ambos en TypeScript. Los dos necesitan las mismas reglas de validación: si el formulario acepta un importe que la API rechaza (o al revés), la persona usuaria ve errores confusos.

## Decisión

Un solo repositorio con tres paquetes, gestionados con **npm workspaces** (incluido en npm, sin herramientas extra):

- `apps/web`, `apps/api`
- `packages/shared`: esquemas Zod, tipos inferidos y códigos de error.

## Consecuencias

- **A favor:** una regla se cambia en un lugar y ambos lados la aplican; un solo `npm install`, una sola configuración de ESLint, TypeScript y CI; un solo historial de Git para mostrar en el portafolio.
- **En contra:** `shared` debe compilarse antes que las apps (lo hacen los scripts `dev`, `build` y `test`).
- **Descartado:** Turborepo o Nx. Aportan caché de compilación, que no se necesita con tres paquetes.
