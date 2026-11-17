# ADR 0003 — El dinero nunca es un `number`

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

En JavaScript, `0.1 + 0.2` da `0.30000000000000004`, porque `number` es punto flotante binario. Sumar cientos de gastos así produce totales con céntimos de más o de menos: inaceptable en una app de finanzas (requisito 5.3).

## Decisión

1. **Base de datos:** `NUMERIC(12,2)`: decimal exacto, hasta 9 999 999 999.99.
2. **Sumas y totales:** se calculan en PostgreSQL con `SUM()`, que opera en decimal exacto.
3. **API:** los importes viajan como **texto** (`"85.50"`), nunca como número JSON. `amountSchema` (en `shared`) acepta solo dígitos con hasta 2 decimales y mayores que cero.
4. **Código del servidor:** se usa `Prisma.Decimal` cuando hay que operar con importes; nunca `parseFloat`.
5. **Frontend:** solo formatea el texto recibido para mostrarlo (`Intl.NumberFormat`); no suma importes.

## Consecuencias

- **A favor:** totales exactos de punta a punta; la prueba CP-09 (decimales) es fácil de verificar.
- **En contra:** hay que convertir texto ↔ `Decimal` en los bordes de la API.
- **Descartado:** guardar céntimos como enteros. También funciona, pero complica las consultas y obliga a dividir por 100 en cada pantalla.
