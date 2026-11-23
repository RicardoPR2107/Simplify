import type { MovementView } from '@simplify/shared';
import { useState } from 'react';
import { EmptyState, Skeleton } from '../components/feedback/feedback';
import { FormAlert } from '../components/ui/form';
import { PlusIcon } from '../components/ui/icons';
import { describeError } from '../features/auth/forms';
import { useCurrentUser } from '../features/auth/useAuth';
import { useCategories } from '../features/categories/api';
import { PAGE_SIZE, useMovements } from '../features/movements/api';
import { DeleteMovementDialog } from '../features/movements/DeleteMovementDialog';
import { MovementFiltersBar } from '../features/movements/MovementFiltersBar';
import { MovementForm } from '../features/movements/MovementForm';
import { MovementList } from '../features/movements/MovementList';
import { Pagination } from '../features/movements/Pagination';
import { useMovementFilters } from '../features/movements/useMovementFilters';

/** RF-07: historial de movimientos, con alta, edición y eliminación. */
export default function HistoryPage() {
  const filterState = useMovementFilters();
  const { filters, update, clear, active, params, setParams } = filterState;
  const { data: user } = useCurrentUser();
  const { data: categories } = useCategories();
  const movements = useMovements(filters);

  const [editing, setEditing] = useState<MovementView | null>(null);
  const [deleting, setDeleting] = useState<MovementView | null>(null);

  // "Nuevo movimiento" del menú lateral abre el formulario con ?nuevo=1.
  const creating = params.get('nuevo') === '1';
  function setCreating(open: boolean) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (open) next.set('nuevo', '1');
        else next.delete('nuevo');
        return next;
      },
      { replace: true },
    );
  }

  const currency = user?.currency ?? 'USD';
  const data = movements.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Historial</h1>
          <p className="text-muted">
            Todos tus ingresos y gastos, con filtros para encontrar cualquiera.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="hidden h-12 items-center gap-2 rounded-full bg-hero px-6 hover:bg-hero-hover font-semibold text-on-hero md:flex"
        >
          <PlusIcon />
          Nuevo movimiento
        </button>
      </div>

      <MovementFiltersBar state={filterState} categories={categories} />

      <section
        aria-label="Resultados"
        aria-busy={movements.isFetching}
        className="flex flex-col gap-4"
      >
        {movements.isPending ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando movimientos…</span>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : movements.isError ? (
          <div className="flex flex-col items-start gap-3">
            <FormAlert>{describeError(movements.error)}</FormAlert>
            <button
              type="button"
              onClick={() => void movements.refetch()}
              className="h-11 rounded-full border border-line px-5 font-semibold hover:bg-faint"
            >
              Reintentar
            </button>
          </div>
        ) : data && data.total === 0 ? (
          active ? (
            <EmptyState
              title="No hay movimientos con estos filtros"
              description="Prueba con otro periodo, tipo o texto de búsqueda."
              action={
                <button
                  type="button"
                  onClick={clear}
                  className="font-semibold text-accent hover:underline"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Aún no hay movimientos"
              description="Registra tu primer ingreso o gasto para empezar a ver tu historial."
              action={
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="h-12 rounded-full bg-hero px-6 hover:bg-hero-hover font-semibold text-on-hero"
                >
                  Registrar movimiento
                </button>
              }
            />
          )
        ) : data && data.items.length === 0 ? (
          // Página fuera de rango (por ejemplo, tras borrar el último de la última página).
          <EmptyState
            title="Esta página está vacía"
            description="No hay más movimientos en esta página."
            action={
              <button
                type="button"
                onClick={() => update({ page: undefined })}
                className="font-semibold text-accent hover:underline"
              >
                Ir a la primera página
              </button>
            }
          />
        ) : data ? (
          <>
            <MovementList
              movements={data.items}
              currency={currency}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={PAGE_SIZE}
              onChange={(page) => update({ page: page === 1 ? undefined : String(page) })}
            />
          </>
        ) : null}
      </section>

      {creating && <MovementForm onClose={() => setCreating(false)} />}
      {editing && (
        <MovementForm
          movement={editing}
          onClose={() => setEditing(null)}
          onDelete={(movement) => {
            setEditing(null);
            setDeleting(movement);
          }}
        />
      )}
      {deleting && (
        <DeleteMovementDialog
          movement={deleting}
          currency={currency}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
