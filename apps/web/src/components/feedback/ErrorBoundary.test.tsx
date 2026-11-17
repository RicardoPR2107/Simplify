import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
function FragileChart() {
  if (shouldThrow) throw new Error('falló el gráfico');
  return <p>Gráfico listo</p>;
}

function Page() {
  return (
    <div>
      <p>Contenido que sigue visible</p>
      <ErrorBoundary section="el gráfico">
        <FragileChart />
      </ErrorBoundary>
    </div>
  );
}

describe('ErrorBoundary', () => {
  it('aísla el fallo de una sección y permite reintentar', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
    render(<Page />);

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos mostrar el gráfico.');
    expect(screen.getByText(/Contenido que sigue visible/)).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Gráfico listo')).toBeInTheDocument();
    spy.mockRestore();
  });
});
