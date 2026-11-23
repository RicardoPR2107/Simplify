# ADR 0005 — Balanceo de carga con Nginx y chequeos pasivos

- **Estado:** aceptada (Fase 6)
- **Fecha:** 2026-11-23

## Contexto

El producto pide balanceo de carga entre varias instancias de la API. Hace falta decidir qué reparte el tráfico, con qué estrategia y cómo se detecta una instancia caída, sin añadir infraestructura de pago ni servicios externos.

## Decisión

- **Nginx** como único punto de entrada: sirve el frontend compilado y reparte `/api` entre las instancias (`upstream`). Un solo origen para web y API evita CORS y permite cookies `SameSite=Lax`.
- **Estrategia `least_conn`**: cada petición va a la instancia con menos conexiones abiertas. Con peticiones de duración desigual (un resumen mensual tarda más que leer una categoría) reparte mejor que turnos fijos (round-robin).
- **Chequeos pasivos**: Nginx de código abierto no consulta `/health/ready` por su cuenta (eso es de Nginx Plus). En su lugar observa el tráfico real: si una instancia no responde (error de conexión, tiempo agotado, 502 o 503), reintenta la petición en otra y, tras 3 fallos, la aparta 10 segundos (`max_fails=3 fail_timeout=10s`).
- **Reintentos seguros**: `proxy_next_upstream` solo reintenta automáticamente cuando la petición no llegó a procesarse o es de lectura; un `POST` que sí llegó a una instancia no se repite, para no registrar dos veces un movimiento.
- **Docker** vigila cada contenedor con su propio `HEALTHCHECK`, y `depends_on: service_healthy` hace que Nginx solo arranque cuando las APIs están listas.

## Consecuencias

- **A favor:** sin dependencias nuevas; apagar una instancia no produce errores visibles (verificado con k6: 0 errores en 4 299 peticiones con una instancia detenida a mitad de la prueba).
- **En contra:** una instancia que responde lento pero sin errores no se aparta; la detección depende de que haya tráfico.
- **Revisar si:** se despliega en un orquestador (Kubernetes, ECS), que ya trae balanceo y chequeos activos; entonces Nginx quedaría solo para servir la web.
