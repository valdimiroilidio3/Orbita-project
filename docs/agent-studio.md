# ORBITA CHAT — Agent Studio (Fase 05)

> Gestão de agentes IA: criação, edição, estados e configuração de voz.
> Camada de dados: `apps/web/lib/server/agents.ts` + `agent-actions.ts`.
> UI: `apps/web/app/(dashboard)/agents/*` + `apps/web/components/agents/*`.

## O que está implementado

| Área                   | Conteúdo                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listagem `/agents`     | Dados reais da organização ativa (RLS) ou demo rotulada; filtros por estado; estados vazios; paginação pronta no serviço (`limit`/`offset`/total) |
| Criação `/agents/new`  | Formulário completo: nome, descrição, instruções (limite 20 000 com contador), idioma, configuração de voz — cria em **rascunho**                 |
| Detalhe `/agents/[id]` | Edição, transições de estado, eliminação (owner/admin), avisos de operação                                                                        |
| Server actions         | `createAgentAction`, `updateAgentAction`, `setAgentStatusAction`, `deleteAgentAction` — validação Zod sempre no servidor                          |

## Regras de produto

### Máquina de estados do agente

```
draft ──publicar──▶ active ⇄ paused
  │                  │
  └────arquivar──────┴──arquivar──▶ archived ──restaurar──▶ draft
```

Transições definidas em `AGENT_STATUS_TRANSITIONS` (`@orbita/shared`); no-ops e
transições fora da tabela são rejeitadas no servidor.

### Configuração de voz — sem segredos

`voice_config` aceita **apenas campos estruturados** (`voiceId`, `speed`,
`pitch`, `greeting`, `style`) validados por `voiceConfigSchema` (objeto
`strict`). Chaves não suportadas — `apiKey`, `token`, `secret`, etc. — são
rejeitadas. Segredos de fornecedores pertencem exclusivamente a variáveis de
ambiente do servidor.

### Permissões (UI = conveniência; RLS = autoridade)

| Ação                           | owner | admin | member |
| ------------------------------ | ----- | ----- | ------ |
| Criar/editar agentes e estados | ✅    | ✅    | ✅     |
| Eliminar agente                | ✅    | ✅    | ❌     |

A organização vem sempre da sessão validada (`organization_id` nunca é aceite
do cliente). A eliminação **retém o histórico de chamadas** (`agent_id` → NULL).

## Dados reais vs demonstração

- Sem Supabase configurado: listagem mostra os agentes demo (badge `Demo` +
  `DemoBanner`); o formulário de criação está visível mas **desativado** — nada
  é criado nem simulado.
- Agentes demo são de leitura no detalhe, com aviso explícito.
- Registos reais nunca são misturados com demo (`isDemo` marcado pelo id).

## Limitações desta fase (deliberadas)

- Sem motor de voz, chamadas reais ou fornecedores externos — `voiceConfig` é
  apenas configuração guardada.
- Sem duplicação de agentes, import/export ou versionamento de instruções.
- A paginação do serviço está pronta; a UI mostra os primeiros 50 agentes.

## Testes

`apps/web/tests/agent-studio.test.ts` — schemas (limites, rejeição de
segredos), máquina de estados, permissões e mapeamentos. Executar com
`pnpm test`.
