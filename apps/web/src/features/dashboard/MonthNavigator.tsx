import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ui/icons';

/** Selector de mes (◀ Noviembre 2026 ▶) compartido por el dashboard y las estadísticas. */
export function MonthNavigator({
  label,
  isCurrent,
  onPrevious,
  onNext,
}: {
  label: string;
  isCurrent: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      aria-label="Mes del resumen"
      className="flex items-center gap-1 rounded-full border border-line bg-card p-1"
    >
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Mes anterior"
        className="flex size-10 items-center justify-center rounded-full hover:bg-faint"
      >
        <ChevronLeftIcon width={18} height={18} />
      </button>
      <p aria-live="polite" className="min-w-36 text-center font-semibold">
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={isCurrent}
        aria-label="Mes siguiente"
        className="flex size-10 items-center justify-center rounded-full enabled:hover:bg-faint disabled:opacity-30"
      >
        <ChevronRightIcon width={18} height={18} />
      </button>
    </nav>
  );
}
