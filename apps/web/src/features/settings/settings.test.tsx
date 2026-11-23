import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser } from '../../test/api-mock';
import { renderApp } from '../../test/render';

function setup() {
  return mockApi({ 'GET /me': { body: { user: testUser } } });
}

async function open() {
  renderApp('/configuracion');
  const profile = await screen.findByRole('region', { name: 'Perfil' });
  const currency = screen.getByRole('region', { name: 'Moneda' });
  return { profile, currency };
}

describe('Configuración', () => {
  it('muestra el perfil con el correo de solo lectura y la moneda actual', async () => {
    setup();
    const { profile, currency } = await open();

    expect(within(profile).getByLabelText('Nombre')).toHaveValue('Ricardo Palma');
    expect(within(profile).getByLabelText('Correo electrónico')).toBeDisabled();
    expect(within(currency).getByLabelText('Moneda')).toHaveValue('PEN');
  });

  it('no repite el tema ni el cierre de sesión (ya están en la barra superior)', async () => {
    setup();
    await open();
    expect(screen.queryByRole('radio', { name: 'Oscuro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sesión' })).not.toBeInTheDocument();
    // Siguen disponibles en la barra superior.
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modo oscuro/i })).toBeInTheDocument();
  });

  it('guarda solo el nombre desde la tarjeta de perfil', async () => {
    const mock = setup();
    mock.on('PATCH /me', { body: { user: { ...testUser, name: 'Ricardo' } } });
    const { profile } = await open();

    const name = within(profile).getByLabelText('Nombre');
    await userEvent.clear(name);
    await userEvent.type(name, ' Ricardo ');
    await userEvent.click(within(profile).getByRole('button', { name: 'Guardar nombre' }));

    expect(await screen.findByText('Nombre actualizado')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ name: 'Ricardo' });
  });

  it('valida el nombre antes de enviar', async () => {
    const mock = setup();
    const { profile } = await open();

    await userEvent.clear(within(profile).getByLabelText('Nombre'));
    await userEvent.click(within(profile).getByRole('button', { name: 'Guardar nombre' }));

    expect(within(profile).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
    expect(within(profile).getByLabelText('Nombre')).toHaveFocus();
    expect(mock.calls.some((c) => c.method === 'PATCH')).toBe(false);
  });

  it('previsualiza la moneda y aclara que no convierte los importes', async () => {
    setup();
    const { currency } = await open();

    await userEvent.selectOptions(within(currency).getByLabelText('Moneda'), 'Euro (EUR)');
    expect(currency).toHaveTextContent(/€\s?1,250\.50|1,250\.50\s?€/);
    expect(currency).toHaveTextContent(/S\/\s?100\.00 pasaría a mostrarse como €\s?100\.00/);
  });

  it('guarda solo la moneda y se aplica en toda la app', async () => {
    const mock = setup();
    mock.on('PATCH /me', { body: { user: { ...testUser, currency: 'USD' } } });
    const { currency } = await open();

    await userEvent.selectOptions(
      within(currency).getByLabelText('Moneda'),
      'Dólar estadounidense (USD)',
    );
    await userEvent.click(within(currency).getByRole('button', { name: 'Guardar moneda' }));

    expect(await screen.findByText('Moneda actualizada')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ currency: 'USD' });
    // El perfil en caché ya tiene la moneda nueva: la vista previa deja de mostrar el ejemplo.
    expect(currency).not.toHaveTextContent('pasaría a mostrarse');
  });
});
