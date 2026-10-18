import {
  AGENT_STATUS_LABELS,
  CALL_STATUS_LABELS,
  type AgentStatus,
  type CallStatus,
} from '@orbita/shared';

import { Badge, type BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const AGENT_STATUS_VARIANT: Record<AgentStatus, BadgeVariant> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  archived: 'outline',
};

const CALL_STATUS_VARIANT: Record<CallStatus, BadgeVariant> = {
  queued: 'neutral',
  initiating: 'info',
  ringing: 'info',
  in_progress: 'info',
  completed: 'success',
  failed: 'danger',
  busy: 'warning',
  no_answer: 'warning',
  cancelled: 'outline',
  transferred: 'accent',
};

export interface StatusBadgeProps {
  status: AgentStatus | CallStatus;
  kind: 'agent' | 'call';
  className?: string;
}

/** Badge de estado consistente para agentes e chamadas. */
export function StatusBadge({ status, kind, className }: StatusBadgeProps) {
  const variant =
    kind === 'agent'
      ? AGENT_STATUS_VARIANT[status as AgentStatus]
      : CALL_STATUS_VARIANT[status as CallStatus];
  const label =
    kind === 'agent'
      ? AGENT_STATUS_LABELS[status as AgentStatus]
      : CALL_STATUS_LABELS[status as CallStatus];
  return (
    <Badge variant={variant} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
