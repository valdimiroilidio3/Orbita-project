import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Sistema de campos de formulário — label visível, texto de ajuda,
 * mensagem de erro, obrigatóriedade e associação acessível automática.
 *
 * Uso:
 * <FormField label="Email" hint="Nunca partilhado" error={erro} required>
 *   {({ id, describedBy, invalid }) => (
 *     <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
 *   )}
 * </FormField>
 */
export interface FieldControlProps {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

export interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error), required })}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption font-medium text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
