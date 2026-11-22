import type { CategoryView, MovementType } from '@simplify/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '../components/feedback/feedback';
import { FormAlert } from '../components/ui/form';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/ui/icons';
import { describeError } from '../features/auth/forms';
import { byType, useCategories } from '../features/categories/api';
import { CategoryForm } from '../features/categories/CategoryForm';
import { DeleteCategoryDialog } from '../features/categories/DeleteCategoryDialog';

/** RF-10: gestión de categorías, separadas en gastos e ingresos. */
export default function CategoriesPage() {
  const categories = useCategories();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<CategoryView | null>(null);
  const [deleting, setDeleting] = useState<CategoryView | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Categorías</h1>
          <p className="text-muted">
            Organiza tus movimientos con las categorías que tengan sentido para ti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-hero px-6 font-semibold text-on-hero"
        >
          <PlusIcon />
          Nueva categoría
        </button>
      </div>

      {categories.isPending ? (
        <div role="status" className="grid gap-6 lg:grid-cols-2">
          <span className="sr-only">Cargando categorías…</span>
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : categories.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{describeError(categories.error)}</FormAlert>
          <button
            type="button"
            onClick={() => void categories.refetch()}
            className="h-11 rounded-full border border-line px-5 font-semibold hover:bg-faint"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <CategoryGroup
            title="Gastos"
            type="EXPENSE"
            categories={byType(categories.data, 'EXPENSE')}
            onRename={setRenaming}
            onDelete={setDeleting}
          />
          <CategoryGroup
            title="Ingresos"
            type="INCOME"
            categories={byType(categories.data, 'INCOME')}
            onRename={setRenaming}
            onDelete={setDeleting}
          />
        </div>
      )}

      {creating && <CategoryForm onClose={() => setCreating(false)} />}
      {renaming && <CategoryForm category={renaming} onClose={() => setRenaming(null)} />}
      {deleting && <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

interface CategoryGroupProps {
  title: string;
  type: MovementType;
  categories: CategoryView[];
  onRename: (category: CategoryView) => void;
  onDelete: (category: CategoryView) => void;
}

function CategoryGroup({ title, type, categories, onRename, onDelete }: CategoryGroupProps) {
  const headingId = `categorias-${type.toLowerCase()}`;
  const accent = type === 'INCOME' ? 'bg-income' : 'bg-expense';
  const action =
    'flex size-10 items-center justify-center rounded-full text-muted hover:bg-faint hover:text-ink';

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col rounded-card border border-line bg-card"
    >
      <header className="border-b border-line px-5 py-4">
        <h2 id={headingId} className="flex items-center gap-2.5 text-lg font-semibold">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${accent}`} />
          {title}
          <span className="tabular text-sm font-normal text-muted">({categories.length})</span>
        </h2>
      </header>

      {categories.length === 0 ? (
        <p className="px-5 py-10 text-center text-muted">
          Aún no tienes categorías de {title.toLowerCase()}.
        </p>
      ) : (
        <ul aria-label={`Categorías de ${title.toLowerCase()}`}>
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="truncate">{category.name}</span>
                  {category.isDefault && (
                    <span className="rounded-full bg-faint px-2 py-0.5 text-xs font-medium text-muted">
                      Predeterminada
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {category.movementCount > 0 ? (
                    <Link
                      to={`/historial?type=${type}&categoryId=${category.id}`}
                      className="tabular underline-offset-4 hover:text-accent hover:underline"
                    >
                      {category.movementCount}{' '}
                      {category.movementCount === 1 ? 'movimiento' : 'movimientos'}
                    </Link>
                  ) : (
                    'Sin movimientos'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRename(category)}
                aria-label={`Renombrar ${category.name}`}
                title="Renombrar"
                className={action}
              >
                <PencilIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(category)}
                aria-label={`Eliminar ${category.name}`}
                title="Eliminar"
                className={`${action} hover:text-expense`}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
