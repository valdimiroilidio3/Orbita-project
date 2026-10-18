# Integrações das ferramentas — estado real

## Migração 0005 (`supabase/migrations/0005_tools_automations.sql`)

Criada e validada sintaticamente (libpg-query, 74 statements). **NÃO aplicada** a nenhuma
instância Supabase neste ambiente. Aplicar localmente com `supabase db reset` e executar
`supabase test db` (pgTAP 1–22). Nenhuma migração remota foi executada.

## O que funciona com dados reais (após aplicar a migração)

| capacidade                                       | estado                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Perfil público da empresa (Definições)           | real — `business_profiles`                                 |
| `business_info.lookup`                           | real                                                       |
| `availability.check`                             | real — horário do perfil − marcações confirmadas           |
| `contact_request.create`                         | real — `contact_requests`                                  |
| Workflows (criar/editar/executar/histórico)      | real — disparados pelo simulador e por eventos de ingestão |
| Autorização por agente (`agent_tools`)           | real                                                       |
| Aprovações humanas                               | real (UI em `/tools`)                                      |
| Auditoria (`tool_executions`, `automation_runs`) | real                                                       |

## Pendente / dependente de fornecedor

| capacidade                                     | estado                                                                                                                          | o que falta                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appointment.create` com sistema externo       | **DevBookingAdapter** (desenvolvimento, identificado como tal em todos os resultados; grava na BD local)                        | implementar `BookingProvider` para o sistema de reservas escolhido (`lib/tools/booking.ts` → `getBookingProvider`)                                                                                                  |
| `call.transfer`                                | devolve `unsupported` + alternativa                                                                                             | telefonia real com suporte a transferência (Prompt 07 pendente); destinos têm de ser rotas configuradas pela organização                                                                                            |
| Tool calling em chamadas reais                 | **PENDENTE** — a camada expõe `executeTool` e `ToolResult`; não existe adaptador para o formato de payload de nenhum fornecedor | ao ativar o fornecedor de IA do Prompt 07, criar `lib/voice/adapters/<fornecedor>-tools.ts` que converta pedido→`executeTool`→resposta **segundo a documentação oficial da versão usada** (formatos não inventados) |
| Gatilhos `call.received/failed/no_answer/busy` | código ligado à ingestão                                                                                                        | só ocorrem com webhooks reais                                                                                                                                                                                       |

## Variáveis de ambiente

Nenhuma nova. A persistência privilegiada reutiliza `SUPABASE_SERVICE_ROLE_KEY` (servidor).
Sem ela, `executeTool` devolve `internal_error` honesto («persistência não configurada»).

## Diagnóstico

- `/tools/[id]` → «Últimas execuções» com estado e mensagem.
- `/automations/[id]` → histórico com resultado por passo.
- Logs: `[automations] falha ao disparar workflows` (sem argumentos nem segredos).
