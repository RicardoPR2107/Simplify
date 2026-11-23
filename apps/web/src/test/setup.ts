import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetApiState } from '../lib/api';

// Las búsquedas asíncronas (findBy…, waitFor) esperan hasta 8 s en lugar de 1 s: la primera
// carga de una página perezosa puede tardar varios segundos en equipos lentos. Cuando el elemento
// aparece antes, la prueba sigue de inmediato: el límite alto no hace más lentas las pruebas.
configure({ asyncUtilTimeout: 8000 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetApiState();
  document.cookie = 'simplify_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.documentElement.classList.remove('dark');
});
