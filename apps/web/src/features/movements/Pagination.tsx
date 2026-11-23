import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ui/icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** "Mostrando 11–20 de 47" y botones anterior/siguiente. */
export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const button =
    'flex h-11 items-center gap-1 rounded-full border border-line bg-card px-4 text-sm font-semibold disabled:opacity-40 enabled:hover:bg-faint';

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-4">
      <p className="tabular whitespace-nowrap text-sm text-muted">
        Mostrando {first}–{last} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon width={16} height={16} />
          <span className="hidden sm:inline">Anterior</span>
        </button>
        <span className="tabular whitespace-nowrap px-1 text-sm" aria-current="page">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className={button}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRightIcon width={16} height={16} />
        </button>
      </div>
    </nav>
  );
}
