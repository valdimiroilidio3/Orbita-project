# Segurança das ferramentas e automações

## Princípios

- O modelo de IA só vê o catálogo e resultados sanitizados — **nunca** BD, credenciais, shell, SQL, URLs ou HTTP livres.
- `organization_id`, `agent_id`, `user_id`, `call_id` e permissões **nunca** vêm dos argumentos; o executor deriva-os de contexto autenticado (sessão, chamada persistida, workflow da organização).
- Catálogo allowlisted (`TOOL_IDS`); ferramentas desconhecidas → `not_found` sem execução.
- O modelo **não** altera políticas: `effectiveToolRisk` nunca baixa do mínimo (`MINIMUM_TOOL_RISK`); aprovações são decididas por owner/admin na UI, com validação de organização, prazo e correspondência exata da execução (`evaluateApprovalDecision`).

## Níveis de risco e confirmação (§5)

| nível | ferramentas | confirmação |
|---|---|---|
| baixo | consultas (informação, disponibilidade) | nenhuma |
| moderado | pedido de contacto, marcação, transferência | verbal do interlocutor **após** sucesso; `requireApproval` opcional por agente |
| elevado | — (não implementado nesta fase) | aprovação humana obrigatória (`human_approval`) |

Confirmação verbal demonstra intenção, **não** substitui autenticação forte.

## Base de dados e RLS (migração 0005)

| tabela | select | insert | update | delete |
|---|---|---|---|---|
| `business_profiles` | membro | owner/admin | owner/admin | — |
| `contact_requests` | membro | membro | membro | — |
| `appointments` | membro | membro | membro | — |
| `agent_tools` | membro | owner/admin | owner/admin | owner/admin |
| `tool_executions` | membro | **negado** (servidor) | **negado** | — |
| `tool_approvals` | membro | **negado** (servidor) | owner/admin | — |
| `automation_workflows` | membro | owner/admin | owner/admin | owner/admin |
| `automation_runs` | membro | **negado** (servidor) | **negado** | — |

Todas têm `organization_id` imutável (trigger `org_guard`). As escritas privilegiadas usam o cliente de
service role (`lib/supabase/service.ts`) **só** no servidor e **depois** de o executor verificar
explicitamente a autorização — RLS não é considerada suficiente por si.

## Anti-abuso (§13)

- Rate limiting: 20 execuções/min por chamada, 120/min por organização (via `tool_executions`).
- Argumentos ≤ 8 KB; timeouts por ferramenta (5–15 s); workflow ≤ 5 passos e 5–120 s.
- Duplicação: chaves de idempotência + índices únicos + `automation_runs` único por evento.
- Prompt injection: argumentos validados por schema; placeholders de workflow allowlisted (texto
  desconhecido permanece literal); instruções do sistema endurecidas no Prompt 07 separam conteúdo falado.
- Logs sem argumentos nem resultados; `error_message` ≤ 500 chars sanitizado; nunca stack traces.
- Retenção: resultados são escalares curtos (≤ 500 chars); política de limpeza documentada em
  `voice-security.md` (RGPD) — a aplicar quando houver dados reais.

## Testes de segurança executados

Unitários (vitest): ferramenta inexistente, argumentos inválidos, agente sem permissão, aprovações
(válida/expirada/não autorizada/operação diferente), idempotência. pgTAP 18–22 (acesso cruzado,
alteração de permissões por membro, escrita de execuções por cliente, aprovações alheias) —
**preparados, não executados** neste ambiente (sem PostgreSQL).
