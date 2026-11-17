import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { AppShell } from './components/layout/AppShell';
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

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'historial', element: <HistoryPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'estadisticas', element: <StatsPage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
