import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckIcon } from './icons';

interface Toast {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

/** Avisos breves de confirmación ("Movimiento registrado"). Se anuncian a lectores de pantalla. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-28 z-[60] flex flex-col items-center gap-2 md:bottom-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-bg shadow-lg"
          >
            <CheckIcon width={18} height={18} />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
