import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser, type ApiMock } from '../../test/api-mock';
import { renderApp } from '../../test/render';
import { currentPeriod, periodLabel, shiftPeriod } from '../dashboard/period';

const now = currentPeriod();
const values: Array<[string, string, string]> = [
  ['3000.00', '2000.00', '1000.00'],
  ['3000.00', '3300.50', '-300.50'],
  ['0.00', '0.00', '0.00'],
  ['3500.10', '1999.90', '1500.20'],
  ['0.00', '120.00', '-120.00'],
  ['4000.00', '2500.00', '1500.00'],
];
const months = values.map(([income, expense, balance], i) => ({
  ...shiftPeriod(now, i - 5),
  income,
  expense,
  balance,
}));

function setup(
  incomeItems: unknown[] = [
    {
      categoryId: 'dddddddd-0000-4000-8000-000000000001',
      name: 'Salario',
      total: '3000.00',
      percentage: 75,
    },
    {
      categoryId: 'dddddddd-0000-4000-8000-000000000002',
      name: 'Freelance',
      total: '1000.00',
      percentage: 25,
    },
  ],
): ApiMock {
  return mockApi({
    'GET /me': { body: { user: testUser } },
    'GET /summary/evolution': { body: { months } },
    'GET /summary/categories': { body: { type: 'INCOME', total: '4000.00', items: incomeItems } },
  });
}

describe('Estadísticas', () => {
  it('calcula los indicadores del periodo', async () => {
    setup();
    renderApp('/estadisticas');

    const savings = await screen.findByText('Ahorro en 6 meses');
    expect(savings.parentElement).toHaveTextContent(/S\/\s?3,579\.70/);
    expect(screen.getByText('Tasa de ahorro').parentElement).toHaveTextContent('26.5%');
    expect(screen.getByText('Gasto promedio mensual').parentElement).toHaveTextContent(/1,653\.40/);
    expect(screen.getByText('Mes con más gastos').parentElement).toHaveTextContent(
      periodLabel(months[1]!),
    );
    expect(screen.getByText(/En 2 meses del periodo gastaste más/)).toBeInTheDocument();
  });

  it('muestra el detalle mensual del más reciente al más antiguo, con totales', async () => {
    setup();
    renderApp('/estadisticas');

    const table = await screen.findByRole('table', { name: /tasa de ahorro por mes/ });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(8); // encabezado + 6 meses + total
    expect(rows[1]).toHaveTextContent(periodLabel(now));
    expect(rows[1]).toHaveTextContent('37.5%');
    // Un mes sin ingresos no tiene tasa de ahorro calculable.
    expect(rows[2]).toHaveTextContent('—');
    expect(rows[7]).toHaveTextContent('Total');
    expect(rows[7]).toHaveTextContent(/13,500\.10/);
  });

  it('el gráfico de balance tiene una descripción con las cifras', async () => {
    setup();
    renderApp('/estadisticas');
    const chart = await screen.findByRole('figure', { name: 'Balance de los últimos 6 meses' });
    expect(chart).toHaveTextContent(new RegExp(`${periodLabel(months[1]!)}: -S/\\s?300\\.50`));
  });

  it('desglosa los ingresos del mes por categoría', async () => {
    setup();
    renderApp('/estadisticas');
    const list = await screen.findByRole('list', { name: 'Ingresos por categoría' });
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Salario');
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('75%');
  });

  it('indica cuando no hubo ingresos en el mes', async () => {
    setup([]);
    renderApp('/estadisticas');
    expect(await screen.findByText(/No registraste ingresos en/)).toBeInTheDocument();
  });

  it('cambia el periodo con el selector de mes', async () => {
    const mock = setup();
    renderApp('/estadisticas');
    await userEvent.click(await screen.findByRole('button', { name: 'Mes anterior' }));

    const previous = shiftPeriod(now, -1);
    await waitFor(() =>
      expect(
        mock.calls
          .filter((c) => c.path === '/summary/evolution')
          .at(-1)!
          .query.get('month'),
      ).toBe(String(previous.month)),
    );
  });
});
