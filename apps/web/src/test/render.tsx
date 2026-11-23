import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '../lib/queryClient';
import { routes } from '../routes';

/** Renderiza la app completa (rutas reales y React Query) en la ruta indicada. */
export function renderApp(path: string) {
  const queryClient = createQueryClient({ retryDelay: 0 });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, queryClient };
}
