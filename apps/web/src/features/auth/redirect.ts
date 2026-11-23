/**
 * Destino tras iniciar sesión, tomado de `?redirect=`.
 * Solo se aceptan rutas internas: "/historial" sí; "https://otro-sitio.com" o "//otro-sitio.com"
 * no (evita una "redirección abierta", que un atacante usaría para llevar a la persona
 * a una página falsa después de iniciar sesión en la real).
 */
export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}
