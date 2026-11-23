import {
  SUPPORTED_CURRENCIES,
  updateProfileSchema,
  type Currency,
  type UpdateProfileInput,
  type UserProfile,
} from '@simplify/shared';
import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { FormAlert, SelectField, SubmitButton, TextField } from '../components/ui/form';
import { useToast } from '../components/ui/Toast';
import { ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import {
  describeError,
  firstErrors,
  focusFirstError,
  validateForm,
  type FieldErrors,
} from '../features/auth/forms';
import { useCurrentUser, useUpdateProfile } from '../features/auth/useAuth';

const CURRENCY_NAMES: Record<Currency, string> = {
  PEN: 'Sol peruano',
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  MXN: 'Peso mexicano',
  COP: 'Peso colombiano',
};

/**
 * Configuración (RF-04, RF-18): solo lo que no se puede cambiar desde otra parte.
 * El tema y el cierre de sesión ya están siempre a mano en la barra superior.
 */
export default function SettingsPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Configuración</h1>
        <p className="text-muted">Tu perfil y la moneda en que ves tus importes.</p>
      </div>

      {/* `key` reinicia los formularios si cambia el usuario (por ejemplo, tras volver a entrar). */}
      {user && (
        <div key={user.id} className="grid items-start gap-6 xl:grid-cols-2">
          <ProfileForm user={user} />
          <CurrencyForm user={user} />
        </div>
      )}
    </div>
  );
}

/**
 * Lógica común de guardado: valida con el esquema compartido, muestra los errores por campo
 * y confirma con un aviso. Cada tarjeta guarda solo su propio dato.
 */
function useProfileSave(formRef: RefObject<HTMLFormElement | null>) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});

  function save(values: UpdateProfileInput, message: string) {
    const result = validateForm(updateProfileSchema, values);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(formRef.current, result.errors);
      return;
    }
    setErrors({});
    update.mutate(result.data, {
      onSuccess: () => toast(message),
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          setErrors(firstErrors(error.fields));
        }
      },
    });
  }

  const generalError =
    update.error &&
    !(update.error instanceof ApiError && Object.keys(update.error.fields).length > 0)
      ? describeError(update.error)
      : null;

  return { save, errors, generalError, pending: update.isPending };
}

function ProfileForm({ user }: { user: UserProfile }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { save, errors, generalError, pending } = useProfileSave(formRef);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') ?? '');
    save({ name }, 'Nombre actualizado');
  }

  return (
    <Section title="Perfil" description="Cómo te saluda Simplify.">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {generalError && <FormAlert>{generalError}</FormAlert>}
        <TextField
          label="Nombre"
          name="name"
          autoComplete="name"
          maxLength={60}
          defaultValue={user.name}
          error={errors.name}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          value={user.email}
          readOnly
          disabled
          hint={<p className="text-sm text-muted">El correo no se puede cambiar.</p>}
        />
        <div>
          <SubmitButton pending={pending} pendingLabel="Guardando…">
            Guardar nombre
          </SubmitButton>
        </div>
      </form>
    </Section>
  );
}

function CurrencyForm({ user }: { user: UserProfile }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { save, errors, generalError, pending } = useProfileSave(formRef);
  const [currency, setCurrency] = useState<Currency>(user.currency);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save({ currency }, 'Moneda actualizada');
  }

  return (
    <Section title="Moneda" description="En la que registras y ves tus importes.">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {generalError && <FormAlert>{generalError}</FormAlert>}
        <SelectField
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
          error={errors.currency}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_NAMES[code]} ({code})
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1 rounded-xl bg-faint px-4 py-3 text-sm">
          <p>
            Así se verán tus importes:{' '}
            <span className="tabular font-semibold">{formatMoney('1250.50', currency)}</span>
          </p>
          <p className="text-muted">
            Cambiarla solo cambia el símbolo: no convierte los importes que ya registraste
            {currency !== user.currency &&
              ` (por ejemplo, ${formatMoney('100', user.currency)} pasaría a mostrarse como ${formatMoney('100', currency)})`}
            .
          </p>
        </div>
        <div>
          <SubmitButton pending={pending} pendingLabel="Guardando…">
            Guardar moneda
          </SubmitButton>
        </div>
      </form>
    </Section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-5 rounded-card border border-line bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
