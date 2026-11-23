import { registerSchema } from '@simplify/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../lib/api';
import { FormAlert, PasswordField, SubmitButton, TextField } from '../components/ui/form';
import { AuthLayout } from '../features/auth/AuthLayout';
import {
  describeError,
  firstErrors,
  focusFirstError,
  validateForm,
  type FieldErrors,
} from '../features/auth/forms';
import { PasswordRequirements } from '../features/auth/PasswordRequirements';
import { useRegister } from '../features/auth/useAuth';

/** RF-01: creación de cuenta. Al terminar, la sesión ya queda iniciada y GuestOnly lleva al dashboard. */
export default function RegisterPage() {
  const register = useRegister();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = validateForm(registerSchema, values);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(formRef.current, result.errors);
      return;
    }
    setErrors({});
    register.mutate(result.data, {
      onError: (error) => {
        // Errores de un campo concreto (por ejemplo, el correo ya registrado) se muestran en él.
        if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
          setErrors({ email: error.message });
        } else if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          setErrors(firstErrors(error.fields));
        }
      },
    });
  }

  const fieldError =
    register.error instanceof ApiError && register.error.code === 'EMAIL_ALREADY_REGISTERED';
  const generalError =
    register.error &&
    !fieldError &&
    !(register.error instanceof ApiError && Object.keys(register.error.fields).length > 0);

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza a ordenar tus ingresos y gastos. Solo toma un minuto."
      footer={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link
            to="/iniciar-sesion"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {generalError && <FormAlert>{describeError(register.error)}</FormAlert>}
        <TextField
          label="Nombre"
          name="name"
          autoComplete="name"
          placeholder="Cómo quieres que te llamemos"
          error={errors.name}
          autoFocus
        />
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          error={errors.email}
        />
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={<PasswordRequirements value={password} />}
        />
        <SubmitButton pending={register.isPending} pendingLabel="Creando cuenta…">
          Crear cuenta
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
