# ORBITA CHAT — Configuração do Motor de Voz (voice-setup.md)

> Integração **pendente**: este guia explica o que configurar e como testar.
> Nenhuma credencial real ou fictícia é incluída no repositório.

## 1. Variáveis de ambiente

Copia `apps/web/.env.example` para `apps/web/.env.local` e preenche apenas as
secções que fores ativar. Os valores ausentes produzem o estado explícito
**«Não configurado»** — a aplicação continua a funcionar nas restantes áreas.

| Variável                                                           | Onde obter                             | Para que serve                                      | Ambiente |
| ------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------- | -------- |
| `VOICE_PROVIDER`                                                   | —                                      | Seleção: `pending` \| `openai-realtime` \| `twilio` | servidor |
| `TELEPHONY_PROVIDER`                                               | —                                      | Seleção: `pending` \| `sip` \| `twilio`             | servidor |
| `OPENAI_API_KEY`                                                   | platform.openai.com → API keys         | Sessões de voz em tempo real                        | servidor |
| `OPENAI_WEBHOOK_SECRET`                                            | Painel de webhooks OpenAI              | Assinatura de webhooks de voz                       | servidor |
| `TELEPHONY_WEBHOOK_SECRET`                                         | Definido por ti + painel do fornecedor | Assinatura de webhooks telefónicos                  | servidor |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | console.twilio.com                     | Telefonia (apenas `TELEPHONY_PROVIDER=twilio`)      | servidor |
| `PUBLIC_WEBHOOK_BASE_URL`                                          | Infraestrutura de deploy               | URL pública dos webhooks                            | servidor |
| `SUPABASE_SERVICE_ROLE_KEY`                                        | Supabase → Settings → API              | **Apenas** ingestão de webhooks no servidor         | servidor |
| `VOICE_CALL_MAX_DURATION_SECONDS`                                  | política tua                           | Limite de duração (default 3600)                    | servidor |
| `VOICE_CALL_TRANSIENT_TIMEOUT_MIN`                                 | política tua                           | Reconciliação de chamadas pendentes (default 30)    | servidor |
| `VOICE_WEBHOOK_MAX_PAYLOAD_BYTES`                                  | conforme fornecedor                    | Limite de payload (default 65536)                   | servidor |
| `VOICE_WEBHOOK_REPLAY_WINDOW_SECONDS`                              | conforme fornecedor                    | Janela anti-replay (default 300)                    | servidor |

**Nunca** `NEXT_PUBLIC_` em segredos. **Nunca** valores fictícios que pareçam funcionais.

## 2. Webhooks e URL pública

Quando ativares um fornecedor, regista no painel dele:

- `POST {PUBLIC_WEBHOOK_BASE_URL}/api/voice/webhooks/inbound` — chamadas recebidas
- `POST {PUBLIC_WEBHOOK_BASE_URL}/api/voice/webhooks/status` — estados/eventos

O servidor rejeita webhooks sem assinatura válida (fail-closed) e responde
com erros tipados (401 assinatura, 400 payload, 409 replay, 413 tamanho,
429 rate limit, 503 não configurado).

## 3. Como executar localmente

```bash
pnpm install
supabase start && supabase db reset   # aplica migrações LOCALMENTE
cp apps/web/.env.example apps/web/.env.local  # preencher Supabase (+ voz, se existir)
pnpm dev
```

## 4. Como testar SEM chamadas pagas

1. `pnpm test` — testes unitários do motor (mocks identificados como tais).
2. `supabase test db` — suíte RLS pgTAP (inclui `call_events`).
3. `curl -X POST localhost:3000/api/voice/webhooks/status` — confirma o
   comportamento fail-closed (503/401) sem fornecedor configurado.
4. Painel **Definições → Motor de voz — diagnóstico** confirma os estados.

## 5. Como realizar um teste real controlado (quando existirem credenciais)

1. Configura as variáveis acima num ambiente de **teste** do fornecedor.
2. Implementa os adaptadores reais contra a documentação oficial
   (`apps/web/lib/voice/adapters/index.ts`).
3. Limita custos: número de teste, `VOICE_CALL_MAX_DURATION_SECONDS` baixo,
   alertas de gasto no painel do fornecedor.
4. Efetua UMA chamada curta para o número de entrada associado ao agente.
5. Verifica: estado da chamada no Calls Center, `voice_session_id`,
   `answered_at`, eventos em `call_events`, ausência de segredos nos logs.
6. Documenta o resultado em `docs/voice-testing.md` — só então o diagnóstico
   pode passar a «Ligação verificada» (derivado de uma chamada real concluída).

## 6. Diagnóstico de falhas

| Sintoma                 | Causa provável                                        | Ação                                    |
| ----------------------- | ----------------------------------------------------- | --------------------------------------- |
| Webhook responde 503    | Fornecedor/`SUPABASE_SERVICE_ROLE_KEY` por configurar | Ver variáveis                           |
| Webhook responde 401    | Assinatura/segredo errados ou corpo re-serializado    | Comparar segredo e raw body             |
| Webhook responde 409    | Replay/janela de tempo                                | Ver relógio e reenvio                   |
| Chamada fica «em curso» | Estado final nunca chegou                             | Reconciliação por timeout (documentada) |
| Agente recusa sessão    | Pausado/arquivado/sem voz                             | Agent Studio → secção Voz e telefonia   |

## 7. Custos e configuração de conta

Custos de telefonia e de voz dependem da conta/região do fornecedor — **não
assumidos nem estimados aqui**. Consulta a faturação do fornecedor antes de
ativar chamadas reais.
