import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useSidebar } from '../../hooks/useSidebar';
import { useTheme } from '../../hooks/useTheme';
import { BrandLogo } from '../brand/Logo';
import { OfflineBanner, PageSkeleton } from '../feedback/feedback';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import {
  ChartIcon,
  DashboardIcon,
  HistoryIcon,
  MoonIcon,
  PlusIcon,
  SettingsIcon,
  SidebarIcon,
  SunIcon,
  TagIcon,
} from '../ui/icons';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/historial', label: 'Historial', icon: HistoryIcon, end: false },
  { to: '/categorias', label: 'Categorías', icon: TagIcon, end: false },
  { to: '/estadisticas', label: 'Estadísticas', icon: ChartIcon, end: false },
] as const;

/**
 * Estructura común de las pantallas autenticadas, a pantalla completa:
 * - Escritorio y tablet: menú lateral verde de alto completo, que se contrae a solo íconos.
 * - Móvil: cabecera con logo y barra de navegación flotante abajo.
 * - Barra superior: acciones globales (tema; en la Fase 1, menú de usuario).
 */
export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { collapsed, toggle } = useSidebar();
  const dark = theme === 'dark';

  /*
   * Todas las filas del menú comparten la misma columna de íconos (16 px desde el borde):
   * al expandir solo aparece el texto a la derecha; los íconos no se mueven.
   */
  const label = collapsed ? 'sr-only' : 'truncate';
  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center gap-3 whitespace-nowrap rounded-xl px-4 text-sidebar-text transition-colors ${
      isActive ? 'bg-sidebar-active font-semibold' : 'font-medium hover:bg-sidebar-hover'
    }`;

  return (
    <div className="flex min-h-dvh bg-bg">
      <OfflineBanner />

      <div className="sticky top-0 z-40 hidden h-dvh shrink-0 md:block">
        <aside
          id="menu-lateral"
          className={`flex h-full flex-col gap-6 overflow-hidden bg-sidebar px-3 py-5 transition-[width] duration-200 ${
            collapsed ? 'w-[76px]' : 'w-64'
          }`}
        >
          {/*
           * Fila del logo con altura fija en ambos estados, así nada de abajo se mueve.
           * Contraído, el botón de despliegue aparece sobre el logo al pasar el mouse o con el teclado.
           */}
          <div className="group relative flex h-12 items-center px-1.5">
            <Link to="/" aria-label="Simplify, ir al dashboard" className="rounded-xl">
              <BrandLogo variant="onGreen" hideName={collapsed} />
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-expanded={!collapsed}
              aria-controls="menu-lateral"
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              title={collapsed ? 'Expandir menú' : 'Contraer menú'}
              className={`flex size-10 items-center justify-center rounded-xl text-sidebar-text ${
                collapsed
                  ? 'absolute left-1.5 top-1 bg-sidebar opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
                  : 'ml-auto hover:bg-sidebar-hover'
              }`}
            >
              <SidebarIcon />
            </button>
          </div>

          <Link
            to="/historial?nuevo=1"
            title="Nuevo movimiento"
            className="flex h-11 items-center gap-3 whitespace-nowrap rounded-full bg-cta px-4 font-semibold text-cta-text"
          >
            <PlusIcon />
            <span className={label}>Nuevo movimiento</span>
          </Link>

          <nav aria-label="Principal" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label: text, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={sideLink} title={text}>
                <Icon className="shrink-0" />
                <span className={label}>{text}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-sidebar-line pt-4">
            <NavLink to="/configuracion" className={sideLink} title="Configuración">
              <SettingsIcon className="shrink-0" />
              <span className={label}>Configuración</span>
            </NavLink>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-card px-4 md:justify-end md:px-8">
          <Link to="/" aria-label="Simplify, ir al dashboard" className="rounded-xl md:hidden">
            <BrandLogo variant={dark ? 'dark' : 'light'} />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-faint"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        <main id="contenido" className="flex-1 px-4 pb-32 pt-6 md:px-8 md:pb-10 md:pt-8">
          <ErrorBoundary section="esta página">
            {/* Mientras llega el código de la página (lazy loading) se ve su esqueleto. */}
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <nav
        aria-label="Principal móvil"
        className="fixed inset-x-5 bottom-6 z-40 grid grid-cols-5 items-center rounded-full bg-sidebar p-1.5 shadow-xl md:hidden"
      >
        <MobileLink to="/" label="Dashboard" icon={DashboardIcon} end />
        <MobileLink to="/historial" label="Historial" icon={HistoryIcon} />
        <Link
          to="/historial?nuevo=1"
          aria-label="Nuevo movimiento"
          className="flex h-14 items-center justify-center rounded-full bg-cta text-cta-text"
        >
          <PlusIcon />
        </Link>
        <MobileLink to="/estadisticas" label="Estadísticas" icon={ChartIcon} />
        <MobileLink to="/categorias" label="Categorías" icon={TagIcon} />
      </nav>
    </div>
  );
}

function MobileLink({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string;
  label: string;
  icon: typeof DashboardIcon;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `flex h-14 items-center justify-center rounded-full text-sidebar-text ${
          isActive ? 'bg-sidebar-active' : ''
        }`
      }
    >
      <Icon />
    </NavLink>
  );
}
