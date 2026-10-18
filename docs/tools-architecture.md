# Arquitetura de ferramentas e automações (PROMPT 08)

> Estado: camada de domínio, persistência, UI e testes implementados.
> **Independente do fornecedor de voz** — nenhum contrato de Twilio, SIP ou OpenAI
> entra nesta camada. A ligação ao tool calling real do fornecedor de IA fica
> **PENDENTE** (ver `tool-integrations.md`), porque o motor de voz do Prompt 07
> continua sem credenciais/adaptadores reais.

## 1. Visão geral

```
Fornecedor de IA (pendente) ─┐
UI /tools (teste controlado) ─┼─▶ ToolExecutor ─▶ handlers ─▶ Supabase (tool_executions, …)
Workflows (AutomationService) ┘        │
                                       └─▶ ToolApprovalService (aprovação humana)
Eventos reais (ingestão webhooks · simulador · criação de contactos/marcações)
        └─▶ call-triggers ─▶ AutomationService ─▶ ToolExecutor (fromWorkflow=true)
```

O modelo de IA **nunca** acede à base de dados, a credenciais ou a operações
arbitrárias: só pode pedir uma ferramenta do catálogo, com argumentos que são
validados no servidor.

## 2. Módulos (mapeamento para os contratos do prompt)

| Contrato do prompt | Implementação | Ficheiro |
|---|---|---|
| ToolDefinition | `TOOL_DEFINITIONS` (id, nome, descrição, risco, confirmação, timeout, idempotência, retry) | `packages/shared/src/tools.ts` |
| ToolRegistry | `TOOL_IDS` + `isToolId` + `TOOL_ARGS_SCHEMAS` (allowlist) | `packages/shared/src/tools.ts` |
| ToolExecutor | `executeTool` — pipeline das 12 etapas (§6) | `apps/web/lib/tools/executor.ts` |
| ToolAuthorizationService | `isToolEnabledForAgent` + contexto derivado do servidor | `executor.ts` |
| ToolApprovalService | `evaluateApprovalDecision` (puro) + `decideApprovalAction` | `lib/tools/approvals.ts`, `lib/server/tool-actions.ts` |
| ToolExecutionRepository | `insertToolExecution`, `finalizeToolExecution`, `findExecutionByIdempotencyKey` | `lib/tools/repository.ts` |
| AutomationService | `runAutomationsForTrigger`, `dispatchCallAutomations` | `lib/tools/automation.ts`, `lib/tools/call-triggers.ts` |
| ToolAuditService | a própria tabela `tool_executions` (args, resultado, erro, datas) + `automation_runs` | migração 0005 |
| Handlers | 5 ferramentas iniciais | `lib/tools/handlers.ts` |
| BookingProvider | interface + `DevBookingAdapter` (desenvolvimento, identificado) | `lib/tools/booking.ts` |

## 3. Catálogo inicial

| id | risco | confirmação | idempotente | dados reais? |
|---|---|---|---|---|
| `business_info.lookup` | baixo | nenhuma | sim | **sim** — `business_profiles` da organização |
| `availability.check` | baixo | nenhuma | sim | **sim** — horário do perfil − `appointments` confirmadas |
| `contact_request.create` | moderado | verbal após sucesso | chave | **sim** — `contact_requests` |
| `appointment.create` | moderado | verbal após sucesso | chave | **parcial** — `DevBookingAdapter` (BD local; **não** é sistema de reservas externo) |
| `call.transfer` | moderado | nenhuma | sim | **não** — devolve `unsupported` + alternativa (telefonia pendente) |

Nenhuma ferramenta de risco elevado existe nesta fase (sem pagamentos,
cancelamentos nem eliminações).

## 4. Pipeline de execução (§6)

1. estrutura do pedido → 2. `isToolId` (catálogo) → 3. Zod + limite 8 KB →
4. contexto (`organizationId`, `agentId`, `callId`, `actorUserId`) **vem do servidor**, nunca dos argumentos →
5–6. `agent_tools` (ferramenta ativa para o agente; sem agente = execução operacional pela UI/workflow) →
7. limites (20/min por chamada, 120/min por organização) →
8. aprovação humana (`confirmation = human_approval` ou `agent_tools.config.requireApproval`) →
9. handler com timeout por ferramenta → 10. resultado tipado (`ToolResult`) →
11. `finalizeToolExecution` (auditoria) → 12. retorno estruturado.

Profundidade de recursão = 0: handlers não chamam `executeTool`. Workflows
correm com `fromWorkflow=true` e **não** emitem novos gatilhos.

## 5. Estados e resultados

Execução: `pending · awaiting_approval · running · succeeded · failed · canceled · timed_out`.
Resultado: `success · validation_error · unauthorized · approval_required · not_found · conflict · rate_limited · timeout · provider_unavailable · unsupported · internal_error`.

## 6. Idempotência e falhas externas (§7)

- Chave: fornecida (`manual:`, `wf:`, `approved:`) ou derivada `tool:callId:hash(args)`.
- `tool_executions (organization_id, idempotency_key)` único; `contact_requests`/`appointments` idem;
  `appointments (organization_id, service, starts_at) where status='confirmed'` impede horários duplicados.
- Replay devolve a execução anterior (`replayed: true`) sem repetir efeitos.
- Timeout → `timed_out` com resultado desconhecido; **não há retry automático** de operações com efeito.
- Transação PostgreSQL **não** abrange sistemas externos: para adaptadores reais, o padrão documentado é
  *registar execução `running` → chamar externo → gravar referência*; se a persistência falhar depois do
  sucesso externo, a reconciliação usa a `external_ref` (procurar no externo pela chave de idempotência).
  O `DevBookingAdapter` é local, logo atómico.

## 7. Workflows (§8)

Gatilhos (todos ligados a eventos reais já existentes): `call.received`, `call.completed`, `call.failed`,
`call.no_answer`, `call.busy` (ingestão de webhooks + simulador do Prompt 06), `contact_request.created`,
`appointment.created` (após execuções reais fora de workflows).

Limites: ≤ 5 passos, timeout 5–120 s, `automation_runs (workflow_id, trigger_key)` único (anti-reentrada),
placeholders allowlisted (`{{call.fromNumber}}`, `{{call.toNumber}}`, `{{call.id}}`, `{{contact.phone}}`,
`{{contact.name}}`). Falha num passo interrompe a sequência. Execução síncrona e sequencial no
request — sem filas/Redis (limitação documentada em `tool-integrations.md`).

## 8. UI

`/tools`, `/tools/[id]` (esquema, agentes autorizados, execução controlada, últimas execuções),
`/automations`, `/automations/new`, `/automations/[id]` (edição + histórico), Calls Center → secção
«Ações executadas pelo agente», Definições → «Perfil público da empresa».
