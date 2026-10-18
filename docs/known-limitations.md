# Limitações conhecidas

Lista honesta do que **não** está pronto, para que ninguém assuma o contrário.

## Funcionalidade

| Área              | Estado                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chamadas reais    | **Não existem.** O histórico aceita chamadas do simulador (`provider = 'simulado'`, rotuladas) e de webhooks (pipeline pronto, nunca testado com fornecedor real). «Ligação verificada» nunca é mostrado sem chamada real documentada. |
| Voz IA            | Adaptadores `openai-realtime`/`twilio` são esqueletos fail-closed. Capacidades, modelos e eventos de fornecedores **não foram confirmados** contra documentação oficial (sem acesso à rede neste ambiente).                            |
| Billing           | **Não implementado.** `/billing` é informativo; não há planos, pagamentos, Stripe nem limites por plano. Variáveis `STRIPE_*` reservadas e não lidas.                                                                                  |
| Analytics         | Só agregações de chamadas reais dos últimos 30 dias. Sem métricas de áudio/latência (não medidas).                                                                                                                                     |
| Marcações         | `DevBookingAdapter` (dev) — sem calendário real; conflitos só por unicidade (org, serviço, início).                                                                                                                                    |
| Automações        | Execução síncrona no pedido, sem fila nem retries; só triggers listados em `docs/automation-workflows.md`.                                                                                                                             |
| Contactos         | Vista de pedidos/marcações criados por ferramentas; sem CRM, importação ou edição de contactos.                                                                                                                                        |
| Equipa / convites | Gestão de papéis e remoção implementadas (`/settings/members`, via RPC da migração 0006); convites por email **não** (sem serviço de email nem política INSERT).                                                                       |
| Definições        | Preferências/notificações são guardadas mas o **envio** de notificações, tema escuro, interface EN, MFA, listagem de sessões, avatar e eliminação de conta/organização não estão implementados (estado visível na UI).                 |
| `apps/api`        | Esqueleto NestJS vazio; toda a lógica vive em server actions/rotas do Next.js.                                                                                                                                                         |

## Segurança

- CSP usa `'unsafe-inline'` em `script-src` (sem nonces). Mitigado por `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`; melhoria futura: nonces via middleware.
- Rate limiting de webhooks é em memória por instância (`SlidingWindowRateLimiter`) — não partilhado entre réplicas. Rate limit de ferramentas usa contagens na BD (partilhado).
- Server actions não têm rate limit próprio além do Supabase Auth.
- RLS e triggers **nunca foram executados** contra PostgreSQL neste ambiente — ver `docs/testing.md`.

## Operação

- Logs estruturados (`lib/observability/logger.ts`) vão para stdout; não há integração com APM/alertas.
- Sem backups automáticos definidos pelo repositório (responsabilidade do projeto Supabase).
- Sem CI de e2e (Playwright bloqueado no ambiente de desenvolvimento).

## Documentação histórica

`docs/sprint-01*.md` e secções «Fase 0X» descrevem o estado em cada fase; prevalece este ficheiro e `docs/production-readiness.md`.
