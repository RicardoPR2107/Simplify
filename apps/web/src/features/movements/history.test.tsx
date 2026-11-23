import type { MovementView } from '@simplify/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser, type ApiMock } from '../../test/api-mock';
import { renderApp } from '../../test/render';

// Los ids son UUID porque el formulario valida con el mismo esquema que la API.
const categories = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    name: 'Salario',
    type: 'INCOME',
    isDefault: true,
    movementCount: 1,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    name: 'Alimentación',
    type: 'EXPENSE',
    isDefault: true,
    movementCount: 1,
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    name: 'Vivienda',
    type: 'EXPENSE',
    isDefault: true,
    movementCount: 0,
  },
];

const salary: MovementView = {
  id: 'm-1',
  type: 'INCOME',
  description: 'Sueldo noviembre',
  amount: '3000.00',
  date: '2026-11-01',
  notes: null,
  category: { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Salario', type: 'INCOME' },
};
const groceries: MovementView = {
  id: 'm-2',
  type: 'EXPENSE',
  description: 'Supermercado',
  amount: '250.75',
  date: '2026-11-15',
  notes: 'Compra semanal',
  category: { id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'Alimentación', type: 'EXPENSE' },
};

function page(items: MovementView[], total = items.length, pageNumber = 1) {
  return {
    body: { items, page: pageNumber, pageSize: 10, total, totalPages: Math.ceil(total / 10) },
  };
}

function setup(items: MovementView[] = [groceries, salary], total?: number): ApiMock {
  return mockApi({
    'GET /me': { body: { user: testUser } },
    'GET /categories': { body: { categories } },
    'GET /movements': page(items, total),
  });
}

const lastQuery = (mock: ApiMock) =>
  mock.calls.filter((c) => c.method === 'GET' && c.path === '/movements').at(-1)!.query;

describe('Historial de movimientos', () => {
  it('muestra los movimientos con importe, signo y categoría', async () => {
    setup();
    renderApp('/historial');

    const table = await screen.findByRole('table', { name: 'Movimientos' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Supermercado');
    expect(rows[1]).toHaveTextContent('15 nov 2026');
    expect(rows[1]).toHaveTextContent(/−S\/\s?250\.75/);
    expect(rows[2]).toHaveTextContent(/\+S\/\s?3,000\.00/);
    expect(screen.getByText('Mostrando 1–2 de 2')).toBeInTheDocument();
  });

  it('pagina y conserva la página en la URL', async () => {
    const mock = setup([salary], 23);
    const { router } = renderApp('/historial');

    await userEvent.click(await screen.findByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(lastQuery(mock).get('page')).toBe('2'));
    expect(router.state.location.search).toBe('?page=2');
  });

  it('filtra por tipo y vuelve a la primera página', async () => {
    const mock = setup();
    const { router } = renderApp('/historial?page=3');
    await screen.findByRole('table', { name: 'Movimientos' });

    await userEvent.click(screen.getByRole('radio', { name: 'Gastos' }));
    await waitFor(() => expect(lastQuery(mock).get('type')).toBe('EXPENSE'));
    expect(lastQuery(mock).get('page')).toBe('1');
    expect(router.state.location.search).toBe('?type=EXPENSE');
  });

  it('busca por descripción cuando se deja de escribir', async () => {
    const mock = setup();
    renderApp('/historial');
    await screen.findByRole('table', { name: 'Movimientos' });

    await userEvent.type(screen.getByLabelText('Buscar'), 'super');
    await waitFor(() => expect(lastQuery(mock).get('q')).toBe('super'));
    // Una sola petición con el texto final, no una por cada letra.
    expect(mock.calls.filter((c) => c.query.has('q'))).toHaveLength(1);
  });

  it('ordena por importe', async () => {
    const mock = setup();
    renderApp('/historial');
    await screen.findByRole('table', { name: 'Movimientos' });

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Mayor importe');
    await waitFor(() => expect(lastQuery(mock).get('sortBy')).toBe('amount'));
    expect(lastQuery(mock).get('order')).toBe('desc');
  });

  it('sin movimientos invita a registrar el primero', async () => {
    setup([]);
    renderApp('/historial');
    expect(await screen.findByText('Aún no hay movimientos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar movimiento' })).toBeInTheDocument();
  });

  it('sin resultados por los filtros, ofrece limpiarlos', async () => {
    setup([]);
    const { router } = renderApp('/historial?type=INCOME&q=xyz');

    expect(await screen.findByText('No hay movimientos con estos filtros')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]!);
    expect(router.state.location.search).toBe('');
  });

  it('ignora valores inválidos escritos a mano en la URL', async () => {
    const mock = setup();
    renderApp('/historial?type=OTRO&page=-4&from=ayer');
    await screen.findByRole('table', { name: 'Movimientos' });

    const query = lastQuery(mock);
    expect(query.get('type')).toBeNull();
    expect(query.get('page')).toBe('1');
    expect(query.get('from')).toBeNull();
  });
});

describe('Registrar un movimiento', () => {
  it('se abre desde "Nuevo movimiento" del menú lateral (?nuevo=1)', async () => {
    setup();
    renderApp('/historial?nuevo=1');
    expect(await screen.findByRole('dialog', { name: 'Nuevo movimiento' })).toBeInTheDocument();
  });

  it('valida antes de enviar', async () => {
    const mock = setup();
    renderApp('/historial?nuevo=1');
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(within(dialog).getByLabelText('Importe')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByText('Escribe el importe.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Importe')).toHaveFocus();
    expect(within(dialog).getByText('Elige una categoría.')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('registra un gasto aceptando coma decimal y lo confirma', async () => {
    const mock = setup();
    mock.on('POST /movements', { status: 201, body: { movement: groceries } });
    renderApp('/historial');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo movimiento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });

    await userEvent.type(within(dialog).getByLabelText('Importe'), '250,75');
    await userEvent.type(within(dialog).getByLabelText('Descripción'), 'Supermercado');
    await userEvent.selectOptions(within(dialog).getByLabelText('Categoría'), 'Alimentación');
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-15' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Movimiento registrado')).toBeInTheDocument();
    // Cerrar el formulario cambia la URL (quita ?nuevo=1), y esa navegación termina un instante después.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mock.calls.find((c) => c.method === 'POST' && c.path === '/movements')!.body).toEqual({
      type: 'EXPENSE',
      amount: '250.75',
      description: 'Supermercado',
      categoryId: 'aaaaaaaa-0000-4000-8000-000000000002',
      date: '2026-11-15',
      notes: '',
    });
  });

  it('al cambiar el tipo solo ofrece categorías de ese tipo', async () => {
    setup();
    renderApp('/historial?nuevo=1');
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });
    const select = within(dialog).getByLabelText('Categoría');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));

    await userEvent.selectOptions(select, 'Vivienda');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Ingreso' }));

    expect(select).toHaveValue('');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Elige una categoría', 'Salario']);
  });

  it('el foco no salta mientras se completa el formulario', async () => {
    setup();
    renderApp('/historial?nuevo=1');
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo movimiento' });
    const select = within(dialog).getByLabelText('Categoría');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));

    await userEvent.selectOptions(select, 'Vivienda');
    await userEvent.click(within(dialog).getByLabelText('Descripción'));
    await userEvent.type(within(dialog).getByLabelText('Descripción'), 'Alquiler');

    expect(within(dialog).getByLabelText('Descripción')).toHaveFocus();
    expect(within(dialog).getByLabelText('Descripción')).toHaveValue('Alquiler');
  });

  it('al cerrarse devuelve el foco al botón que lo abrió', async () => {
    setup();
    renderApp('/historial');
    const opener = await screen.findByRole('button', { name: 'Nuevo movimiento' });
    await userEvent.click(opener);
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(opener).toHaveFocus();
  });

  it('se cierra con Escape', async () => {
    setup();
    renderApp('/historial?nuevo=1');
    await screen.findByRole('dialog', { name: 'Nuevo movimiento' });
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Editar y eliminar', () => {
  it('edita un movimiento con los datos ya cargados', async () => {
    const mock = setup();
    mock.on('PATCH /movements/m-2', { body: { movement: { ...groceries, amount: '260.00' } } });
    renderApp('/historial');

    const table = await screen.findByRole('table', { name: 'Movimientos' });
    await userEvent.click(within(table).getByRole('button', { name: 'Editar Supermercado' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar movimiento' });

    const amount = within(dialog).getByLabelText('Importe');
    expect(amount).toHaveValue('250.75');
    expect(within(dialog).getByLabelText('Notas (opcional)')).toHaveValue('Compra semanal');
    await userEvent.clear(amount);
    await userEvent.type(amount, '260');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Movimiento actualizado')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'PATCH')!.body).toMatchObject({
      amount: '260',
      categoryId: 'aaaaaaaa-0000-4000-8000-000000000002',
    });
  });

  it('pide confirmación antes de eliminar', async () => {
    const mock = setup();
    mock.on('DELETE /movements/m-2', { status: 204 });
    renderApp('/historial');

    const table = await screen.findByRole('table', { name: 'Movimientos' });
    await userEvent.click(within(table).getByRole('button', { name: 'Eliminar Supermercado' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Eliminar este movimiento?' });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Movimiento eliminado')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'DELETE' && c.path === '/movements/m-2')).toBe(true);
  });

  it('también se puede eliminar desde el formulario de edición', async () => {
    setup();
    renderApp('/historial');
    const table = await screen.findByRole('table', { name: 'Movimientos' });
    await userEvent.click(within(table).getByRole('button', { name: 'Editar Supermercado' }));
    const form = await screen.findByRole('dialog', { name: 'Editar movimiento' });

    await userEvent.click(within(form).getByRole('button', { name: 'Eliminar' }));
    expect(
      await screen.findByRole('dialog', { name: '¿Eliminar este movimiento?' }),
    ).toBeInTheDocument();
  });

  it('cancelar no elimina nada', async () => {
    const mock = setup();
    renderApp('/historial');
    const table = await screen.findByRole('table', { name: 'Movimientos' });
    await userEvent.click(within(table).getByRole('button', { name: 'Eliminar Supermercado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'DELETE')).toBe(false);
  });
});
