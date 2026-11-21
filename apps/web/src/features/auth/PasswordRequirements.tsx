import { CheckIcon } from '../../components/ui/icons';

/** Las mismas reglas que valida la API (passwordSchema), en lenguaje sencillo. */
const RULES = [
  { label: 'Al menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Una letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Un número', test: (v: string) => /\d/.test(v) },
  { label: 'Un carácter especial (# $ % & !)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

/** Lista que se va marcando mientras se escribe la contraseña. */
export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul aria-label="Requisitos de la contraseña" className="grid gap-1 text-sm sm:grid-cols-2">
      {RULES.map(({ label, test }) => {
        const ok = test(value);
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 ${ok ? 'text-income' : 'text-muted'}`}
          >
            <CheckIcon width={16} height={16} className={ok ? '' : 'opacity-30'} />
            {label}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
