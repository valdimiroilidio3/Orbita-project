import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Largura máxima do conteúdo (token --container-content por omissão). */
  width?: 'content' | 'prose' | 'form' | 'full';
}

const WIDTH_CLASS: Record<NonNullable<ContainerProps['width']>, string> = {
  content: 'max-w-[var(--container-content)]',
  prose: 'max-w-[var(--container-prose)]',
  form: 'max-w-[var(--container-form)]',
  full: 'max-w-none',
};

/** Contentor de conteúdo com padding responsivo e largura máxima consistente. */
export function Container({ className, width = 'content', ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', WIDTH_CLASS[width], className)}
      {...props}
    />
  );
}
