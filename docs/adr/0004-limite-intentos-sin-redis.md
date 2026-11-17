# ADR 0004 — Límite de intentos de login sin Redis

- **Estado:** aceptada (se implementa en las Fases 1 y 6)
- **Fecha:** 2026-11-15

## Contexto

El requisito 5.2 pide limitar los intentos de autenticación contra ataques de fuerza bruta. La solución típica (contador en la memoria del proceso) **se rompe con el balanceo de carga**: con dos instancias, cada una lleva su propia cuenta y el atacante obtiene el doble de intentos. La solución habitual es Redis, pero el documento de producto lo excluye para no añadir infraestructura.

## Decisión

Dos barreras independientes:

1. **Aplicación (PostgreSQL):** cada intento se registra en `login_attempts` con la clave `hash(correo + IP)`. Antes de comprobar la contraseña, el servicio cuenta los fallos de esa clave en los últimos 15 minutos; si superan el límite, responde `429 TOO_MANY_ATTEMPTS`. Todas las instancias leen la misma tabla, así que el límite es global.
2. **Balanceador (Nginx, Fase 6):** `limit_req` sobre `/api/v1/auth/` limita las peticiones por IP antes de que lleguen a la API.

Una tarea periódica borra los intentos de más de 24 horas.

## Consecuencias

- **A favor:** funciona con N instancias sin infraestructura nueva; el límite por correo + IP no bloquea a toda una red compartida.
- **En contra:** una escritura en la base de datos por intento de login (despreciable con el volumen esperado).
- **Revisar si:** el volumen de logins crece mucho; entonces Redis estaría justificado.
