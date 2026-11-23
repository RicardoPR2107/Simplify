import type { CategoryView } from '@simplify/shared';
import { useEffect, useState } from 'react';
import { Segmented, SelectField, TextField } from '../../components/ui/form';
import { FilterIcon, SearchIcon } from '../../components/ui/icons';
import { byType } from '../categories/api';
import type { useMovementFilters } from './useMovementFilters';

type FiltersState = ReturnType<typeof useMovementFilters>;

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
] as const;

/** RF-11, RF-12 y RF-13: filtros por tipo, categoría y periodo, búsqueda y orden. */
export function MovementFiltersBar({
  state,
  categories,
}: {
  state: FiltersState;
  categories: CategoryView[] | undefined;
}) {
  const { filters, update, clear, active, sortValue } = state;
  const [search, setSearch] = useState(filters.q ?? '');
  // En móvil los filtros avanzados se pliegan para no ocupar toda la pantalla.
  const [open, setOpen] = useState(false);
  const activeCount = [filters.type, filters.categoryId, filters.from, filters.to].filter(
    Boolean,
  ).length;

  // La búsqueda espera a que la persona deje de escribir (300 ms) para no pedir datos en cada tecla.
  useEffect(() => {
    if (search.trim() === (filters.q ?? '')) return;
    const timer = setTimeout(() => update({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, filters.q, update]);

  // Si los filtros se limpian desde fuera ("Limpiar filtros"), el cuadro de búsqueda también se vacía.
  // Se ajusta durante el render (patrón recomendado por React) en lugar de con un efecto.
  const [previousQ, setPreviousQ] = useState(filters.q);
  if (filters.q !== previousQ) {
    setPreviousQ(filters.q);
    if (!filters.q) setSearch('');
  }

  return (
    <section
      aria-label="Filtros"
      className="flex flex-col gap-4 rounded-card border border-line bg-card p-4 md:p-5"
    >
      <div className="flex items-end gap-3">
        <TextField
          label="Buscar"
          type="search"
          placeholder="Buscar por descripción"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={60}
          trailing={<SearchIcon className="mr-3 text-muted" />}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="filtros-avanzados"
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-line px-4 font-semibold md:hidden"
        >
          <FilterIcon width={18} height={18} />
          Filtros{activeCount > 0 && <span className="tabular">({activeCount})</span>}
        </button>
      </div>
      <div
        id="filtros-avanzados"
        className={`${open ? 'grid' : 'hidden'} gap-4 sm:grid-cols-2 md:grid lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]`}
      >
        <Segmented
          legend="Tipo"
          name="filter-type"
          value={filters.type ?? 'ALL'}
          options={[...TYPE_OPTIONS]}
          onChange={(value) =>
            update({ type: value === 'ALL' ? undefined : value, categoryId: undefined })
          }
        />
        <SelectField
          label="Categoría"
          value={filters.categoryId ?? ''}
          onChange={(event) => update({ categoryId: event.target.value || undefined })}
        >
          <option value="">Todas</option>
          {byType(categories, filters.type).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Desde"
          type="date"
          value={filters.from ?? ''}
          max={filters.to}
          onChange={(event) => update({ from: event.target.value || undefined })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={filters.to ?? ''}
          min={filters.from}
          onChange={(event) => update({ to: event.target.value || undefined })}
        />
        <SelectField
          label="Ordenar por"
          value={sortValue}
          onChange={(event) =>
            update({ sort: event.target.value === 'date-desc' ? undefined : event.target.value })
          }
        >
          <option value="date-desc">Más recientes</option>
          <option value="date-asc">Más antiguos</option>
          <option value="amount-desc">Mayor importe</option>
          <option value="amount-asc">Menor importe</option>
        </SelectField>
      </div>
      {active && (
        <button
          type="button"
          onClick={clear}
          className="self-start text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Limpiar filtros
        </button>
      )}
    </section>
  );
}
