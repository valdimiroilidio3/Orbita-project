# ORBITA CHAT — Segurança do Motor de Voz (voice-security.md)

## 1. Webhooks como entrada não confiável (PROMPT 07 §9)

| Medida                    | Implementação                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verificação de assinatura | `TelephonyProvider.verifyWebhookSignature` — **fail-closed**: sem adaptador/assinatura válida → 401. Utilitário HMAC em `adapters/hmac.ts` (comparação em tempo constante) |
| Anti-replay               | Janela de timestamps (`VOICE_WEBHOOK_REPLAY_WINDOW_SECONDS`) + dedup persistente                                                                                           |
| Deduplicação persistente  | `call_events` com `unique (provider, provider_event_id)` (migração 0004)                                                                                                   |
| Validação de payload      | Parsing por adaptador + limite de tamanho (`VOICE_WEBHOOK_MAX_PAYLOAD_BYTES`) → 413                                                                                        |
| Rate limiting             | Janela deslizante por IP (best-effort, instância única) → 429                                                                                                              |
| Respostas tipadas         | 401 auth ≠ 400 validação ≠ 500/503 internas — sem detalhes internos                                                                                                        |
| Auditoria                 | Logs estruturados com correlação (§5) — **sem segredos, sem conteúdo de conversa**                                                                                         |

## 2. Autorização multi-tenant

- **Nunca** confiar em `organization_id`, `agent_id`, `CallSid` ou
  `call_id` recebidos do fornecedor: a organização resolve-se por
  associações **persistidas e verificadas no servidor**
  (`provider_call_id → calls`, `inbound_phone_number → agents`).
- Operações privilegiadas validam a relação utilizador ↔ organização ↔
  chamada ↔ agente no servidor (sessão + RLS).
- Políticas RLS mantidas em todas as tabelas acessíveis por cliente.
- **`call_events` não tem políticas de escrita para `authenticated`** —
  denegação por omissão: eventos de fornecedor nunca são escritos por
  clientes autenticados.

## 3. Caminho privilegiado de sistema (service role)

A ingestão de webhooks (sem sessão de utilizador) usa
`SUPABASE_SERVICE_ROLE_KEY` **apenas no servidor** (`lib/supabase/service.ts`):

- nunca no browser, bundle ou logs;
- não é usada em operações normais de utilizador (sessão + RLS chegam —
  ver `docs/security.md`);
- sem a variável, a ingestão responde «não configurado» — nunca simula sucesso.

## 4. Segredos e frontend

- Nenhuma chave, token SIP, segredo de assinatura ou credencial no
  frontend/bundle/logs; `.env.example` sem valores funcionais.
- O endpoint `/api/voice/status` é autenticado e devolve apenas **estados**
  (nunca valores de configuração além de nomes de fornecedor selecionados e
  nomes de variáveis em falta).

## 5. Observabilidade segura (PROMPT 07 §16)

Correlação por: `call_id` interno, `organization_id`, `agent_id`,
`provider_call_id`, `voice_session_id`, `provider_event_id`. Nunca em logs:
chaves, tokens, payloads integrais ou conteúdo da conversa.

## 6. Privacidade e conformidade (PROMPT 07 §14) — por defeito

- **Gravação de áudio: desativada** — não existe; ativar só com requisito
  documentado e autorizado.
- **Transcrições: desativadas por defeito** — não são armazenadas.
- Minimização: `call_events` guarda apenas metadados permitidos
  (allowlist em `sanitizeCallEventMetadata`, ≤ 2 KB).
- Números de telefone privados (RLS — só membros da organização).
- Retenção: histórico de chamadas não é apagável por membros (estados
  terminais imutáveis); política de retenção/expurgo a definir por
  organização antes de produção.
- **RGPD**: validar base legal (interesse legítimo/consentimento), informação
  ao interlocutor (aviso no início da chamada quando aplicável), direitos de
  acesso/eliminação. ⚠️ Não assumir consentimento porque a chamada foi
  atendida. Requisitos legais a confirmar com responsável jurídico — esta
  documentação técnica não substitui aconselhamento jurídico.
- Eliminação/exportação: pedidos tratados no servidor com validação de
  identidade e âmbito organizacional (a implementar com o processo de RGPD).

## 7. O que NÃO está garantido ainda

- Esquemas de assinatura de fornecedor concretos (por confirmar na
  documentação oficial da versão utilizada — não inventados).
- Rate limiting distribuído (V1 é por instância).
- Auditoria de acessos administrativos além dos logs estruturados.
