import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser, type ApiMock } from '../../test/api-mock';
import { renderApp } from '../../test/render';

const id = (n: number) => `bbbbbbbb-0000-4000-8000-00000000000${n}`;
const categories = [
  { id: id(1), name: 'Salario', type: 'INCOME', isDefault: true, movementCount: 0 },
  { id: id(2), name: 'Alimentación', type: 'EXPENSE', isDefault: true, movementCount: 3 },
  { id: id(3), name: 'Mascotas', type: 'EXPENSE', isDefault: false, movementCount: 0 },
];

function setup(list = categories): ApiMock {
  return mockApi({
    'GET /me': { body: { user: testUser } },
    'GET /categories': { body: { categories: list } },
  });
}

async function openPage() {
  renderApp('/categorias');
  return screen.findByRole('list', { name: 'Categorías de gastos' });
}

describe('Pantalla de categorías', () => {
  it('separa gastos e ingresos y muestra el uso de cada una', async () => {
    setup();
    const expenses = await openPage();
    const incomes = screen.getByRole('list', { name: 'Categorías de ingresos' });

    expect(within(expenses).getAllByRole('listitem')).toHaveLength(2);
    expect(within(incomes).getByText('Salario')).toBeInTheDocument();
    expect(within(expenses).getByRole('link', { name: '3 movimientos' })).toHaveAttribute(
      'href',
      `/historial?type=EXPENSE&categoryId=${id(2)}`,
    );
    expect(within(expenses).getAllByText('Predeterminada')).toHaveLength(1);
  });

  it('tiene un solo botón para crear, y el tipo se elige en el formulario', async () => {
    const mock = setup();
    mock.on('POST /categories', { status: 201, body: { category: categories[2] } });
    await openPage();

    expect(screen.getAllByRole('button', { name: 'Nueva categoría' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });
    expect(within(dialog).getByRole('radio', { name: 'Gasto' })).toBeChecked();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Ingreso' }));

    await userEvent.type(within(dialog).getByLabelText('Nombre'), '  Ventas ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));

    expect(await screen.findByText('Categoría creada')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'POST')!.body).toEqual({
      name: 'Ventas',
      type: 'INCOME',
    });
  });

  it('muestra en el campo que el nombre ya existe', async () => {
    const mock = setup();
    mock.on('POST /categories', {
      status: 409,
      body: {
        error: {
          code: 'CATEGORY_ALREADY_EXISTS',
          message: 'Ya tienes una categoría con ese nombre.',
        },
      },
    });
    await openPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'mascotas');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() =>
      expect(within(dialog).getByLabelText('Nombre')).toHaveAccessibleDescription(
        /Ya tienes una categoría con ese nombre/,
      ),
    );
  });

  it('valida el nombre antes de enviar', async () => {
    const mock = setup();
    await openPage();
    await userEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva categoría' });

    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'x');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));

    expect(
      within(dialog).getByText('El nombre debe tener al menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('renombra una categoría sin permitir cambiar su tipo', async () => {
    const mock = setup();
    mock.on(`PATCH /categories/${id(3)}`, {
      body: { category: { ...categories[2], name: 'Mascota' } },
    });
    const expenses = await openPage();

    await userEvent.click(within(expenses).getByRole('button', { name: 'Renombrar Mascotas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Renombrar categoría' });
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument();

    const name = within(dialog).getByLabelText('Nombre');
    expect(name).toHaveValue('Mascotas');
    await userEvent.clear(name);
    await userEvent.type(name, 'Mascota');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Categoría actualizada')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ name: 'Mascota' });
  });
});

describe('Eliminar una categoría', () => {
  it('sin movimientos, basta con confirmar', async () => {
    const mock = setup();
    mock.on(`DELETE /categories/${id(3)}`, { status: 204 });
    const expenses = await openPage();

    await userEvent.click(within(expenses).getByRole('button', { name: 'Eliminar Mascotas' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Eliminar "Mascotas"?' });
    expect(within(dialog).queryByLabelText('Mover los movimientos a')).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Categoría eliminada')).toBeInTheDocument();
    const call = mock.calls.find((c) => c.method === 'DELETE')!;
    expect(call.query.get('reassignTo')).toBeNull();
  });

  it('con movimientos, exige elegir el destino entre las del mismo tipo', async () => {
    const mock = setup();
    mock.on(`DELETE /categories/${id(2)}`, { status: 204 });
    const expenses = await openPage();

    await userEvent.click(within(expenses).getByRole('button', { name: 'Eliminar Alimentación' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Eliminar "Alimentación"?' });
    expect(dialog).toHaveAccessibleDescription(/tiene 3 movimientos/);

    const select = within(dialog).getByLabelText('Mover los movimientos a');
    // Solo otras categorías de gastos: ni ella misma ni las de ingresos.
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Elige una categoría', 'Mascotas']);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mover y eliminar' }));
    expect(
      within(dialog).getByText('Elige a qué categoría pasarán los movimientos.'),
    ).toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'DELETE')).toBe(false);

    await userEvent.selectOptions(select, 'Mascotas');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mover y eliminar' }));

    expect(await screen.findByText('Categoría eliminada')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'DELETE')!.query.get('reassignTo')).toBe(id(3));
  });

  it('si es la única de su tipo y tiene movimientos, explica qué hacer', async () => {
    setup([
      { id: id(1), name: 'Salario', type: 'INCOME', isDefault: true, movementCount: 2 },
      { id: id(2), name: 'Alimentación', type: 'EXPENSE', isDefault: true, movementCount: 0 },
    ]);
    await openPage();
    const incomes = screen.getByRole('list', { name: 'Categorías de ingresos' });

    await userEvent.click(within(incomes).getByRole('button', { name: 'Eliminar Salario' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Es tu única categoría de ingresos',
    );
    expect(within(dialog).getByRole('button', { name: 'Mover y eliminar' })).toBeDisabled();
  });
});
