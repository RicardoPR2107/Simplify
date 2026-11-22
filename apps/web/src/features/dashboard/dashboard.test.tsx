import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser, type ApiMock } from '../../test/api-mock';
import { renderApp } from '../../test/render';
import { currentPeriod, periodLabel, shiftPeriod } from './period';

const now = currentPeriod();
const id = (n: number) => `cccccccc-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

function evolution() {
  return Array.from({ length: 6 }, (_, i) => {
    const p = shiftPeriod(now, i - 5);
    const last = i === 5;
    return {
      ...p,
      income: last ? '4500.00' : '3000.00',
      expense: last ? '2750.25' : '1800.00',
      balance: last ? '1749.75' : '1200.00',
    };
  });
}

const movement = {
  id: 'm-1',
  type: 'EXPENSE',
  description: 'Supermercado',
  amount: '250.75',
  date: '2026-11-15',
  notes: null,
  category: { id: id(1), name: 'Alimentación', type: 'EXPENSE' },
};

function setup(overrides: Record<string, unknown> = {}): ApiMock {
  return mockApi({
    'GET /me': { body: { user: testUser } },
    'GET /summary/month': {
      body: { ...now, income: '4500.00', expense: '2750.25', balance: '1749.75' },
    },
    'GET /summary/categories': {
      body: {
        type: 'EXPENSE',
        total: '2750.25',
        items: [
          { categoryId: id(1), name: 'Vivienda', total: '1500.00', percentage: 54.5 },
          { categoryId: id(2), name: 'Alimentación', total: '1250.25', percentage: 45.5 },
        ],
      },
    },
    'GET /summary/evolution': { body: { months: evolution() } },
    'GET /movements': {
      body: { items: [movement], page: 1, pageSize: 10, total: 1, totalPages: 1 },
    },
    ...overrides,
  });
}

const callsTo = (mock: ApiMock, path: string) =>
  mock.calls.filter((c) => c.path === path).map((c) => c.query);

describe('Dashboard', () => {
  it('muestra el balance, los ingresos y los gastos del mes actual', async () => {
    const mock = setup();
    renderApp('/');

    const balance = await screen.findByRole('region', { name: 'Balance del mes' });
    expect(balance).toHaveTextContent(/S\/\s?1,749\.75/);
    expect(screen.getByRole('heading', { name: 'Ingresos' }).parentElement).toHaveTextContent(
      /4,500\.00/,
    );
    expect(screen.getByRole('heading', { name: 'Gastos' }).parentElement).toHaveTextContent(
      /2,750\.25/,
    );
    const nav = screen.getByRole('navigation', { name: 'Mes del resumen' });
    expect(nav).toHaveTextContent(periodLabel(now));
    expect(callsTo(mock, '/summary/month')[0]!.get('month')).toBe(String(now.month));
  });

  it('avisa cuando el balance del mes es negativo', async () => {
    setup({
      'GET /summary/month': {
        body: { ...now, income: '100.00', expense: '250.50', balance: '-150.50' },
      },
    });
    renderApp('/');
    const balance = await screen.findByRole('region', { name: 'Balance del mes' });
    expect(balance).toHaveTextContent(/−S\/\s?150\.50/);
    expect(screen.getByText('Gastaste más de lo que ingresó este mes.')).toBeInTheDocument();
  });

  it('desglosa los gastos por categoría con importe y porcentaje', async () => {
    setup();
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Gastos por categoría' });
    const rows = within(list).getAllByRole('listitem');

    expect(rows[0]).toHaveTextContent('Vivienda');
    expect(rows[0]).toHaveTextContent('54.5%');
    expect(within(rows[0]!).getByRole('link', { name: 'Vivienda' }).getAttribute('href')).toContain(
      `categoryId=${id(1)}`,
    );
  });

  it('con 7 categorías las muestra todas (no agrupa una sola en "Otras")', async () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      categoryId: id(i + 1),
      name: `Categoría ${i + 1}`,
      total: '10.00',
      percentage: 14.3,
    }));
    setup({ 'GET /summary/categories': { body: { type: 'EXPENSE', total: '70.00', items } } });
    renderApp('/');

    const list = await screen.findByRole('list', { name: 'Gastos por categoría' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(list).not.toHaveTextContent('Otras');
  });

  it('agrupa en "Otras" las categorías a partir de la séptima', async () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      categoryId: id(i + 1),
      name: `Categoría ${i + 1}`,
      total: '10.00',
      percentage: 12.5,
    }));
    setup({ 'GET /summary/categories': { body: { type: 'EXPENSE', total: '80.00', items } } });
    renderApp('/');

    const list = await screen.findByRole('list', { name: 'Gastos por categoría' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    expect(rows[6]).toHaveTextContent('Otras (2)');
    expect(rows[6]).toHaveTextContent(/S\/\s?20\.00/);
    expect(rows[6]).toHaveTextContent('25%');
  });

  it('la evolución tiene una tabla accesible y muestra el detalle al enfocar un mes', async () => {
    setup();
    renderApp('/');
    const table = await screen.findByRole('table', { name: /últimos 6 meses/ });
    expect(within(table).getAllByRole('row')).toHaveLength(7);

    const label = periodLabel(now);
    const monthButton = screen.getByRole('button', { name: new RegExp(`^${label}: ingresos`) });
    await userEvent.tab();
    monthButton.focus();
    await waitFor(() => expect(screen.getAllByText(label).length).toBeGreaterThan(1));
  });

  it('navega al mes anterior y no permite ir al futuro', async () => {
    const mock = setup();
    const { router } = renderApp('/');
    const next = await screen.findByRole('button', { name: 'Mes siguiente' });
    expect(next).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    const previous = shiftPeriod(now, -1);
    await waitFor(() =>
      expect(callsTo(mock, '/summary/month').at(-1)!.get('month')).toBe(String(previous.month)),
    );
    expect(router.state.location.search).toBe(
      `?mes=${previous.year}-${String(previous.month).padStart(2, '0')}`,
    );
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Volver al mes actual' })).toBeInTheDocument();
  });

  it('un mes futuro escrito en la URL se ignora', async () => {
    const mock = setup();
    renderApp('/?mes=2999-01');
    expect(await screen.findByRole('navigation', { name: 'Mes del resumen' })).toHaveTextContent(
      periodLabel(now),
    );
    expect(callsTo(mock, '/summary/month')[0]!.get('year')).toBe(String(now.year));
  });

  it('muestra los últimos movimientos', async () => {
    setup();
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Últimos movimientos' });
    expect(list).toHaveTextContent('Supermercado');
    expect(list).toHaveTextContent(/−S\/\s?250\.75/);
  });

  it('sin ningún movimiento, invita a registrar el primero', async () => {
    setup({
      'GET /movements': { body: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 } },
    });
    renderApp('/');

    expect(await screen.findByText('Empieza registrando tu primer movimiento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar movimiento' })).toHaveAttribute(
      'href',
      '/historial?nuevo=1',
    );
  });

  it('si falla un bloque, los demás se muestran y ese permite reintentar', async () => {
    const mock = setup({
      'GET /summary/evolution': {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Algo salió mal.' } },
      },
    });
    renderApp('/');

    expect(await screen.findByRole('list', { name: 'Gastos por categoría' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal.');

    mock.on('GET /summary/evolution', { body: { months: evolution() } });
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table', { name: /últimos 6 meses/ })).toBeInTheDocument();
  });
});
