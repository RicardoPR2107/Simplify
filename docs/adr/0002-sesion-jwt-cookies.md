# ADR 0002 — Sesión con JWT en cookies httpOnly y token de renovación en base de datos

- **Estado:** aceptada (se implementa en la Fase 1)
- **Fecha:** 2026-11-15

## Contexto

La app maneja información financiera personal. La sesión debe resistir XSS (robo del token con JavaScript inyectado) y CSRF (peticiones hechas desde otro sitio con la cookie de la víctima), y funcionar con varias instancias de la API.

## Decisión

- **Token de acceso:** JWT firmado, válido 15 minutos, en cookie `httpOnly`, `Secure`, `SameSite=Lax`. JavaScript no puede leerlo.
- **Token de renovación:** valor aleatorio de 256 bits, válido 7 días, en cookie `httpOnly` limitada a `/api/v1/auth/refresh`. En la base de datos solo se guarda su **hash**. Cada renovación lo rota (se revoca el anterior); si alguien reutiliza uno revocado, se cierran todas las sesiones del usuario.
- **CSRF:** patrón _double submit_: un token no secreto en una cookie legible y en la cabecera `X-CSRF-Token`; la API comprueba que coincidan en toda petición que modifica datos.
- **Cierre de sesión:** revoca el token de renovación y borra las cookies.

## Consecuencias

- **A favor:** el token nunca está en `localStorage`; un JWT corto limita el daño si se filtra; la revocación es inmediata gracias a la base de datos; cualquier instancia valida un JWT sin estado compartido.
- **En contra:** más piezas que una sesión simple; hay que renovar el token en segundo plano desde el frontend.
- **Descartado:** JWT en `localStorage` (vulnerable a XSS); sesiones en memoria (no funcionan con el balanceador).
