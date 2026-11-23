import { lazy, Suspense } from 'react';
import { Outlet, type RouteObject } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { FullScreenLoader, GuestOnly, RequireAuth } from './features/auth/guards';
import { RouteErrorPage } from './pages/RouteErrorPage';

/*
 * Carga perezosa: cada página es un archivo aparte que el navegador descarga
 * solo cuando se visita. El esqueleto de AppShell se muestra mientras tanto.
 */
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

export const routes: RouteObject[] = [
  {
    // Raíz: el error de cualquier ruta cae aquí, y las páginas de acceso (también perezosas)
    // muestran el logo mientras llega su código.
    element: (
      <Suspense fallback={<FullScreenLoader />}>
        <Outlet />
      </Suspense>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/iniciar-sesion',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: '/registro',
        element: (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        ),
      },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'historial', element: <HistoryPage /> },
          { path: 'categorias', element: <CategoriesPage /> },
          { path: 'estadisticas', element: <StatsPage /> },
          { path: 'configuracion', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
