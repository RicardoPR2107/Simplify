import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Nombre de la sección, para que el mensaje diga qué falló. */
  section?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Atrapa errores de una sección (por ejemplo, un gráfico) para que no se caiga toda la pantalla.
 * Muestra un mensaje y un botón para reintentar solo esa parte.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Fase 6: enviar a un servicio de registro de errores. Mientras tanto, a la consola.
    // eslint-disable-next-line no-console
    console.error('Error en la interfaz', error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-card border border-line bg-card p-6"
      >
        <p className="font-semibold">
          {this.props.section
            ? `No pudimos mostrar ${this.props.section}.`
            : 'Algo salió mal aquí.'}
        </p>
        <p className="text-sm text-muted">El resto de la página sigue funcionando.</p>
        <button
          type="button"
          onClick={this.reset}
          className="h-11 rounded-full bg-hero px-5 hover:bg-hero-hover font-semibold text-on-hero"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
