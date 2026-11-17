import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'simplify-theme';

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tema claro/oscuro compartido por toda la app y recordado entre visitas. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin acceso a localStorage (modo privado estricto): el tema dura solo esta sesión.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
    [setTheme],
  );

  return { theme, setTheme, toggleTheme };
}
