import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, testUser, unauthenticated } from '../../test/api-mock';
import { renderApp } from '../../test/render';

const loggedOut = () =>
  mockApi({ 'GET /me': unauthenticated, 'POST /auth/refresh': unauthenticated });

describe('Rutas protegidas', () => {
  it('sin sesión, lleva al inicio de sesión recordando a dónde se quería ir', async () => {
    loggedOut();
    const { router } = renderApp('/historial');

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/iniciar-sesion');
    expect(router.state.location.search).toBe('?redirect=%2Fhistorial');
  });

  it('con sesión, el inicio de sesión redirige al dashboard', async () => {
    mockApi({ 'GET /me': { body: { user: testUser } } });
    renderApp('/iniciar-sesion');
    expect(await screen.findByRole('heading', { name: 'Hola, Ricardo' })).toBeInTheDocument();
  });
});

describe('Servidor no disponible', () => {
  it('reintenta mientras la API arranca y entra en cuanto responde', async () => {
    mockApi({
      'GET /me': (_b, call) =>
        call <= 2 ? { status: 502, body: 'Bad Gateway' } : { body: { user: testUser } },
    });
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Hola, Ricardo' })).toBeInTheDocument();
  });

  it('si no responde tras los reintentos, lo explica y permite reintentar', async () => {
    const mock = mockApi({ 'GET /me': { status: 503, body: 'Service Unavailable' } });
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'No pudimos conectar con Simplify' }),
    ).toBeInTheDocument();

    mock.on('GET /me', { body: { user: testUser } });
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Ricardo' })).toBeInTheDocument();
  });
});

describe('Inicio de sesión', () => {
  it('valida los campos antes de enviar y lleva el foco al primer error', async () => {
    const mock = loggedOut();
    renderApp('/iniciar-sesion');
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));

    const email = screen.getByLabelText('Correo electrónico');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Escribe un correo válido/);
    expect(email).toHaveFocus();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.path === '/auth/login')).toBe(false);
  });

  it('con credenciales correctas entra y va a la página que se pidió', async () => {
    const mock = loggedOut();
    mock.on('POST /auth/login', { body: { user: testUser } });
    const { router } = renderApp('/iniciar-sesion?redirect=%2Fcategorias');

    await userEvent.type(
      await screen.findByLabelText('Correo electrónico'),
      ' Ricardo@Example.com ',
    );
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave#Segura123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Categorías' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/categorias');
    // El correo se envía normalizado, igual que lo espera la API.
    expect(mock.calls.find((c) => c.path === '/auth/login')!.body).toEqual({
      email: 'ricardo@example.com',
      password: 'Clave#Segura123',
    });
  });

  it('muestra el error de credenciales incorrectas', async () => {
    const mock = loggedOut();
    mock.on('POST /auth/login', {
      status: 401,
      body: {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'El correo o la contraseña no son correctos.',
        },
      },
    });
    renderApp('/iniciar-sesion');

    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'ricardo@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no son correctos.',
    );
  });

  it('tras demasiados intentos indica cuántos minutos esperar', async () => {
    const mock = loggedOut();
    mock.on('POST /auth/login', {
      status: 429,
      headers: { 'Retry-After': '540' },
      body: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos.' } },
    });
    renderApp('/iniciar-sesion');

    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'ricardo@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'otra');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Vuelve a intentarlo en 9 minutos.');
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    loggedOut();
    renderApp('/iniciar-sesion');
    const password = await screen.findByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});

describe('Registro', () => {
  it('marca los requisitos de la contraseña mientras se escribe', async () => {
    loggedOut();
    renderApp('/registro');
    const requirements = await screen.findByRole('list', { name: 'Requisitos de la contraseña' });

    await userEvent.type(screen.getByLabelText('Contraseña'), 'abc');
    expect(requirements).toHaveTextContent('Una letra minúscula(cumplido)');
    expect(requirements).toHaveTextContent('Una letra mayúscula(pendiente)');

    await userEvent.type(screen.getByLabelText('Contraseña'), 'D#12345');
    expect(requirements).not.toHaveTextContent('(pendiente)');
  });

  it('crea la cuenta y entra directamente al dashboard', async () => {
    const mock = loggedOut();
    mock.on('POST /auth/register', { status: 201, body: { user: testUser } });
    renderApp('/registro');

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ricardo Palma');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ricardo@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave#Segura123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Hola, Ricardo' })).toBeInTheDocument();
  });

  it('muestra en el campo de correo que ya está registrado', async () => {
    const mock = loggedOut();
    mock.on('POST /auth/register', {
      status: 409,
      body: {
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Ya existe una cuenta con ese correo.',
        },
      },
    });
    renderApp('/registro');

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ricardo');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ricardo@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave#Segura123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription(
        /Ya existe una cuenta con ese correo/,
      ),
    );
  });

  it('no envía una contraseña que no cumple los requisitos', async () => {
    const mock = loggedOut();
    renderApp('/registro');

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ricardo');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ricardo@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'sencilla');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    expect(mock.calls.some((c) => c.path === '/auth/register')).toBe(false);
  });
});

describe('Cierre de sesión', () => {
  it('cierra la sesión y vuelve al inicio de sesión', async () => {
    const mock = mockApi({
      'GET /me': (_b, call) => (call === 1 ? { body: { user: testUser } } : unauthenticated),
      'POST /auth/logout': { status: 204 },
      'POST /auth/refresh': unauthenticated,
    });
    const { router } = renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/iniciar-sesion');
    expect(mock.calls.some((c) => c.path === '/auth/logout')).toBe(true);
  });
});
