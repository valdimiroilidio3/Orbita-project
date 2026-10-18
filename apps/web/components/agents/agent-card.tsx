import { Bot, Globe, MoreHorizontal, Pencil, PhoneCall } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { DemoAgent } from '@/lib/demo-data';

export interface AgentCardProps {
  agent: DemoAgent;
}

/** Cartão de agente: identidade, estado, idioma e ações disponíveis. */
export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-overlay">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft-blue text-primary">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
              {agent.name}
              <Badge variant="accent">Demo</Badge>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              {agent.language}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text"
          aria-label={`Mais ações para ${agent.name}`}
        >
          <MoreHorizontal className="h-4.5 w-4.5" aria-hidden />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 min-h-10 text-sm text-muted">
          {agent.description ?? 'Sem descrição.'}
        </p>
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={agent.status} kind="agent" />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled
              title="Edição disponível numa fase seguinte"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled
              title="Chamadas reais chegam no próximo sprint"
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden />
              Ligar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
