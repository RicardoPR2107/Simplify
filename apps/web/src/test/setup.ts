import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetApiState } from '../lib/api';

// Las búsquedas asíncronas (findBy…, waitFor) esperan hasta 3 s en lugar de 1 s:
// en equipos más lentos, la primera carga de una página perezosa puede pasar de 1 s.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetApiState();
  document.cookie = 'simplify_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.documentElement.classList.remove('dark');
});
