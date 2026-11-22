import type { ReactNode } from 'react';
import { BrandLogo } from '../../components/brand/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Pantallas de acceso: en escritorio, panel verde con el mensaje de la app a la izquierda
 * y el formulario a la derecha; en móvil, solo el formulario.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-text lg:flex">
        <BrandLogo variant="onGreen" />
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Tu dinero, claro y en orden.
          </p>
          <p className="text-lg opacity-80">
            Registra tus ingresos y gastos en segundos y entiende en qué se va cada sol, dólar o
            peso.
          </p>
        </div>
        <p className="text-sm opacity-60">Simplify · Finanzas personales sin complicaciones</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <BrandLogo />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
          <p className="text-center text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}
