# Workflows de automação

## Modelo

`automation_workflows`: nome, organização, `active`, `trigger`, `steps` (1–5), `timeout_seconds`
(5–120). `automation_runs`: estado (`running · succeeded · partial · failed · timed_out`),
`steps_result`, `trigger_key` único por workflow.

Schema partilhado (cliente **e** servidor): `automationWorkflowSchema` em `packages/shared/src/tools.ts`.

## Gatilhos suportados (apenas eventos reais)

| gatilho | origem real |
|---|---|
| `call.received` | ingestão de webhook inbound (Prompt 07, quando houver fornecedor) |
| `call.completed` | ingestão de status **e** simulador do Calls Center (concluir chamada) |
| `call.failed` / `call.no_answer` / `call.busy` | ingestão de status |
| `contact_request.created` | execução real de `contact_request.create` fora de workflows |
| `appointment.created` | execução real de `appointment.create` fora de workflows |

Não há gatilhos temporais nem baseados em eventos inexistentes.

## Passos e placeholders

Cada passo = `{ toolId, args }` com `toolId` do catálogo. Nos argumentos, só estes placeholders são
substituídos: `{{call.fromNumber}}`, `{{call.toNumber}}`, `{{call.id}}`, `{{contact.phone}}`,
`{{contact.name}}`. Qualquer outro texto (incluindo `{{…}}` desconhecido) passa literal.

Exemplo — pedido de contacto automático quando uma chamada não é atendida:

```json
[
  { "toolId": "contact_request.create",
    "args": { "phone": "{{call.fromNumber}}", "reason": "Chamada não atendida — pedido de contacto automático" } }
]
```

## Limites e proteções

- ≤ 5 passos; timeout total; falha num passo interrompe (`failed`/`partial`).
- Anti-ciclo: execuções em workflow têm `fromWorkflow=true` e **não** emitem novos gatilhos;
  `(workflow_id, trigger_key)` único impede reentrada e reativação pelo mesmo evento.
- Idempotência por passo: `wf:{workflowId}:{triggerKey}:{toolId}`.
- Falhas de automação nunca quebram a ingestão nem o Calls Center (`dispatchCallAutomations` não lança).

## Execução (sem fila)

Síncrona no request que processa o evento. Adequado ao volume atual; limitações: sem retry
diferido, sem paralelismo, tempo somado à latência do webhook (mitigado pelo timeout do workflow).
Evolução futura (só com necessidade demonstrada): tabela outbox + worker — **não** introduzido.

## Como testar

1. Definições → Perfil público (horário/serviços).
2. `/automations/new` → gatilho `call.completed`, passo `contact_request.create` com `{{call.fromNumber}}`.
3. Calls Center → iniciar chamada simulada → concluir.
4. `/automations/[id]` mostra a execução; `/tools/contact_request.create` mostra a execução da ferramenta;
   o detalhe da chamada mostra «Ações executadas pelo agente».
