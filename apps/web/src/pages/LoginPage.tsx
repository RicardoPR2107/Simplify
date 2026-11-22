import { loginSchema } from '@simplify/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FormAlert, PasswordField, SubmitButton, TextField } from '../components/ui/form';
import { AuthLayout } from '../features/auth/AuthLayout';
import {
  describeError,
  focusFirstError,
  validateForm,
  type FieldErrors,
} from '../features/auth/forms';
import { useLogin } from '../features/auth/useAuth';

/** RF-02: inicio de sesión. */
export default function LoginPage() {
  const [params] = useSearchParams();
  const login = useLogin();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = validateForm(loginSchema, values);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(formRef.current, result.errors);
      return;
    }
    setErrors({});
    // Al entrar, GuestOnly lleva a la persona a la página que había pedido.
    login.mutate(result.data);
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Qué bueno verte de nuevo. Entra para ver cómo van tus finanzas."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link
            to="/registro"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            Crea una gratis
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {params.get('sesion') === 'expirada' && !login.error && (
          <FormAlert>Tu sesión terminó. Vuelve a iniciar sesión para continuar.</FormAlert>
        )}
        {login.error && <FormAlert>{describeError(login.error)}</FormAlert>}
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          error={errors.email}
          autoFocus
        />
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          error={errors.password}
        />
        <SubmitButton pending={login.isPending} pendingLabel="Entrando…">
          Iniciar sesión
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
