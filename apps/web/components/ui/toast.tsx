import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Toast — feedback de ações.
 *
 * Uso:
 * const { toast } = useToast();
 * toast({ title: 'Guardado', description: 'Alterações aplicadas.', variant: 'success' });
 */

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return context;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const VARIANT_ICON: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

const VARIANT_STYLE: Record<ToastVariant, string> = {
  default: 'border-border text-text',
  success: 'border-success/40 text-success-text',
  warning: 'border-warning/40 text-warning-text',
  danger: 'border-danger/40 text-danger-text',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(0);

  const toast = React.useCallback((options: ToastOptions) => {
    setItems((current) => [...current, { ...options, id: nextId.current++ }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider duration={4000} swipeDirection="right">
        {children}
        {items.map((item) => {
          const Icon = VARIANT_ICON[item.variant ?? 'default'];
          return (
            <ToastPrimitive.Root
              key={item.id}
              duration={item.duration}
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-surface-elevated p-4 shadow-lg',
                'animate-toast-in',
                'data-[state=open]:animate-toast-in data-[swipe=end]:animate-overlay-in',
                VARIANT_STYLE[item.variant ?? 'default'],
              )}
            >
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden />
              <div className="flex-1">
                <ToastPrimitive.Title className="text-small font-semibold">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="mt-0.5 text-caption text-muted">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Fechar notificação"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-soft hover:text-text"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-70 flex w-full max-w-sm flex-col gap-2 p-4 sm:bottom-4 sm:right-4 sm:p-0" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
