import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertIcon, EyeIcon, EyeOffIcon } from './icons';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Elemento a la derecha dentro del campo (por ejemplo, el botón de mostrar contraseña). */
  trailing?: ReactNode;
}

/**
 * Campo de texto accesible: etiqueta asociada, error anunciado por lectores de pantalla
 * (`aria-invalid` + `aria-describedby`) y borde rojo cuando hay un error.
 */
export function TextField({
  label,
  error,
  hint,
  trailing,
  id,
  className = '',
  ...props
}: TextFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-12 w-full rounded-xl border bg-card px-4 text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-ring/30 ${
            error ? 'border-expense' : 'border-line'
          } ${trailing ? 'pr-12' : ''}`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-expense">
          <AlertIcon width={16} height={16} className="shrink-0" />
          {error}
        </p>
      )}
      {hint && <div id={hintId}>{hint}</div>}
    </div>
  );
}

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="flex size-10 items-center justify-center rounded-lg text-muted hover:text-ink"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

/** Mensaje de error general del formulario (no ligado a un campo). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-expense/30 bg-expense-bg px-4 py-3 text-sm text-expense"
    >
      <AlertIcon className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

interface SubmitButtonProps {
  pending: boolean;
  children: ReactNode;
  pendingLabel: string;
}

/** Botón principal: mientras se envía, se desactiva y muestra un indicador de carga. */
export function SubmitButton({ pending, children, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-12 items-center justify-center gap-2 rounded-full bg-hero px-6 font-semibold text-on-hero transition-opacity disabled:opacity-70"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
