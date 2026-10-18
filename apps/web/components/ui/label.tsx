import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Marca visual do campo obrigatório (além do asterisco, usa-se aria-required no controlo). */
  required?: boolean;
}

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-label font-medium text-text',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  ),
);
Label.displayName = 'Label';
