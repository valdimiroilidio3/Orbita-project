/** Evento de fornecedor persistido (registo de auditoria/deduplicação). */
export interface CallEvent {
  id: string;
  organizationId: string;
  callId: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: string;
  processedAt: string;
  metadata: Record<string, string | number | boolean>;
}
