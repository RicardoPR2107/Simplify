import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetApiState } from '../lib/api';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetApiState();
  document.cookie = 'simplify_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.documentElement.classList.remove('dark');
});
