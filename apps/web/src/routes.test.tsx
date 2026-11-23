import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('Navegación y carga perezosa', () => {
  it('muestra el dashboard en la ruta inicial', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hola' })).toBeInTheDocument();
    expect(screen.getByText('Aún no hay movimientos')).toBeInTheDocument();
  });

  it('marca la sección activa en la navegación', async () => {
    renderAt('/historial');
    await screen.findByRole('heading', { level: 1, name: 'Historial' });
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Historial');
  });

  it('navega a otra sección al hacer clic', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Hola' });
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    await userEvent.click(nav.querySelector('a[href="/estadisticas"]')!);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Estadísticas' }),
    ).toBeInTheDocument();
  });

  it('la barra lateral incluye Configuración y el acceso a Nuevo movimiento', async () => {
    renderAt('/configuracion');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configuración' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configuración' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getAllByRole('link', { name: 'Nuevo movimiento' }).length).toBeGreaterThan(0);
  });

  it('muestra la página 404 en una ruta desconocida', async () => {
    renderAt('/no-existe');
    expect(
      await screen.findByRole('heading', { name: 'Esta página no existe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al dashboard' })).toHaveAttribute('href', '/');
  });
});

describe('Tema claro y oscuro', () => {
  it('cambia a modo oscuro y lo indica en el botón', async () => {
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Hola' });
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toBeInTheDocument();
  });
});

describe('Menú lateral desplegable', () => {
  it('se contrae y se expande, y recuerda la preferencia', async () => {
    localStorage.removeItem('simplify-sidebar');
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Hola' });

    const contraer = screen.getByRole('button', { name: 'Contraer menú' });
    expect(contraer).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(contraer);

    const expandir = screen.getByRole('button', { name: 'Expandir menú' });
    expect(expandir).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('simplify-sidebar')).toBe('collapsed');

    // Contraído, los enlaces conservan su nombre para lectores de pantalla.
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav.querySelector('a[href="/historial"]')).toHaveAccessibleName('Historial');

    await userEvent.click(expandir);
    expect(localStorage.getItem('simplify-sidebar')).toBe('expanded');
  });
});
