import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';

interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Centrado (confirmaciones) o como panel desde abajo en móvil (formularios). */
  size?: 'sm' | 'md';
}

/**
 * Ventana modal accesible:
 * - `role="dialog"` + `aria-modal` y título asociado para lectores de pantalla.
 * - Escape o clic fuera la cierran; el foco queda atrapado dentro con Tab.
 * - Al cerrarse, el foco vuelve al botón que la abrió.
 */
export function Dialog({ title, description, onClose, children, size = 'md' }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Se guarda la última versión de onClose sin volver a ejecutar el efecto: si el efecto
  // se repitiera en cada render, el foco saltaría al primer campo mientras se escribe.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const autofocus = panel?.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
    (autofocus ?? panel)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-card bg-card p-6 shadow-2xl outline-none sm:rounded-card ${
          size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-lg'
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-xl font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-faint hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
