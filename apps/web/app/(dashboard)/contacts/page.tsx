import { CalendarCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { formatDateTime, maskPhoneNumber } from '@orbita/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { isSupabaseConfigured } from '@/lib/env';
import { setContactRequestStatusAction } from '@/lib/server/tool-actions';
import { listAppointments, listContactRequests } from '@/lib/server/tools';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos',
};

const REQUEST_STATUS_LABELS = {
  open: 'Por contactar',
  contacted: 'Contactado',
  closed: 'Fechado',
} as const;

const REQUEST_STATUS_VARIANT = {
  open: 'warning',
  contacted: 'info',
  closed: 'neutral',
} as const;

/**
 * Contactos = pedidos de contacto e marcações criados por ferramentas/automações
 * (dados reais da organização). Sem Supabase, não há dados de demonstração.
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const [requests, appointments] = configured
    ? await Promise.all([listContactRequests(), listAppointments()])
    : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contactos"
        description="Pedidos de contacto e marcações registados pelos agentes e automações — apenas dados reais da tua organização."
      />

      {params.updated ? (
        <p
          role="status"
          className="rounded-xl border border-success/40 bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success-text"
        >
          Pedido atualizado.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger-text"
        >
          Não foi possível concluir a operação. Tenta novamente.
        </p>
      ) : null}

      {!configured ? (
        <EmptyState
          icon={Users}
          title="Contactos indisponíveis"
          description="Supabase não configurado — os pedidos de contacto e marcações exigem base de dados real. Não são apresentados dados fictícios."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted" aria-hidden />
                Pedidos de contacto
              </CardTitle>
              <CardDescription>
                Criados pela ferramenta «Criar pedido de contacto». Números mascarados na listagem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-caption text-muted">
                  Ainda sem pedidos. São criados durante chamadas ou por automações (
                  <Link
                    href="/automations"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    ver automações
                  </Link>
                  ).
                </p>
              ) : (
                <ul className="space-y-2">
                  {requests.map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-small font-medium">
                          {request.name ?? 'Sem nome'} · {maskPhoneNumber(request.phone)}
                        </p>
                        <p className="text-caption text-muted">{request.reason}</p>
                        <p className="text-caption text-muted">
                          {formatDateTime(request.createdAt)}
                          {request.preferredPeriod ? ` · ${request.preferredPeriod}` : ''}
                          {request.callId ? (
                            <>
                              {' · '}
                              <Link
                                href={`/calls/${request.callId}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                ver chamada
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={REQUEST_STATUS_VARIANT[request.status]}>
                          {REQUEST_STATUS_LABELS[request.status]}
                        </Badge>
                        {request.status === 'open' ? (
                          <form action={setContactRequestStatusAction}>
                            <input type="hidden" name="id" value={request.id} />
                            <input type="hidden" name="status" value="contacted" />
                            <Button type="submit" variant="outline" size="sm">
                              Marcar contactado
                            </Button>
                          </form>
                        ) : request.status === 'contacted' ? (
                          <form action={setContactRequestStatusAction}>
                            <input type="hidden" name="id" value={request.id} />
                            <input type="hidden" name="status" value="closed" />
                            <Button type="submit" variant="ghost" size="sm">
                              Fechar
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-muted" aria-hidden />
                Marcações
              </CardTitle>
              <CardDescription>
                Criadas pela ferramenta «Criar marcação». Origem «dev-adapter» = adaptador de
                desenvolvimento (não é um sistema de reservas externo).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-caption text-muted">Ainda sem marcações.</p>
              ) : (
                <ul className="space-y-2">
                  {appointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-small font-medium">
                          {appointment.service} · {formatDateTime(appointment.startsAt)}
                        </p>
                        <p className="text-caption text-muted">
                          {appointment.customerName ?? 'Sem nome'} ·{' '}
                          {maskPhoneNumber(appointment.customerPhone)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={appointment.status === 'confirmed' ? 'success' : 'neutral'}>
                          {appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                        <Badge variant="outline">{appointment.source}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
