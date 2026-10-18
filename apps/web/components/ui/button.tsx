import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Button — componente de ação principal do ORBITA CHAT.
 *
 * Variantes: primary (ação prioritária) · secondary · outline · ghost ·
 * destructive · link. Tamanhos: sm · md · lg · icon.
 * Estados: hover · active · focus visível · disabled · loading.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-colors duration-fast ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98] motion-reduce:active:scale-100',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white shadow-xs hover:bg-primary-hover',
        secondary: 'bg-neutral-soft text-text hover:bg-border/70',
        outline: 'border border-border bg-surface text-text shadow-xs hover:bg-background',
        ghost: 'text-text hover:bg-neutral-soft/70',
        destructive: 'bg-danger text-white shadow-xs hover:bg-danger/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-small',
        md: 'h-10 px-4 text-small',
        lg: 'h-12 px-6 text-body',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Estado de carregamento: mostra spinner, bloqueia interação e anuncia via aria-busy. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
