import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Secção de definições: título, descrição curta, badge opcional, conteúdo. */
export function SettingsSection({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Linha chave/valor para dados só de leitura. */
export function SettingRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-small font-medium text-text">{label}</p>
        {hint ? <p className="text-caption text-muted">{hint}</p> : null}
      </div>
      <div className="text-small text-muted sm:text-right">{value}</div>
    </div>
  );
}

/** Valor em falta — nunca inventar. */
export function Unavailable({ label = 'Indisponível' }: { label?: string }) {
  return <Badge variant="neutral">{label}</Badge>;
}

/** Aviso de funcionalidade não implementada / dependente de infraestrutura. */
export function PendingNotice({ title, requirement }: { title: string; requirement: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3">
      <p className="text-small font-medium text-text">{title}</p>
      <p className="mt-0.5 text-caption text-muted">
        <span className="font-medium">Requisito em falta:</span> {requirement}
      </p>
    </div>
  );
}
