import * as React from 'react';

import { cn } from '@/lib/utils';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/** Placeholder de carregamento com pulsação discreta. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-skeleton rounded-md bg-neutral-soft motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
