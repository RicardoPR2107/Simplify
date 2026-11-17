import { useCallback, useState } from 'react';

const STORAGE_KEY = 'simplify-sidebar';

/**
 * Estado del menú lateral (expandido o contraído), recordado entre visitas.
 * La primera vez se contrae solo en pantallas medianas (tablet), donde falta espacio.
 */
function initialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'collapsed') return true;
    if (saved === 'expanded') return false;
  } catch {
    // Sin localStorage: se usa el valor por defecto.
  }
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 1279px)').matches
    : false;
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        // Si no se puede guardar, el estado dura solo esta visita.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
