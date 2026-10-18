# ORBITA CHAT — Arquitetura do Motor de Voz (Prompt 07)

> Estado: **camada de abstração, ciclo de vida e segurança implementados e
> testados; integração real PENDENTE** (sem credenciais de fornecedor e sem
> acesso à documentação oficial neste ambiente — ver §«Integração pendente»).

## 1. Decisão arquitetural — Opção A vs Opção B

| Critério                       | Opção A — SIP direto + voz em tempo real        | Opção B — Twilio Media Streams + ponte WS                           |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| Ponte de áudio no nosso código | **Não** (SIP entrega áudio direto à API de voz) | Sim (WebSocket bidirecional + conversão de codec μ-law 8 kHz ↔ PCM) |
| Latência                       | Menos saltos de rede                            | +1 salto (ponte), conversão adiciona ms                             |
| Complexidade operacional       | **Baixa** — só canal de controlo + webhooks     | Alta — WS persistente, buffers, backpressure, reconexão             |
| Infraestrutura necessária      | Webhooks HTTP + processamento de eventos        | WebSockets persistentes com disponibilidade garantida               |
| Codec/formatos                 | Tratados pelo fornecedor de voz                 | Nossa responsabilidade validar/convertê-los                         |
| Observabilidade                | Eventos de sessão/canais de controlo            | Eventos + telemetria de transporte de áudio                         |
| Testabilidade sem custos       | Simular eventos de controlo                     | Simular eventos + streams de áudio                                  |
| Risco de erros de áudio        | Baixo                                           | Médio (ordem, jitter, perda, interrupções)                          |

**Escolha para a primeira implementação: Opção A — SIP direto + API de voz
em tempo real.** Justificação: elimina a ponte de áudio artificial (o prompt
proíbe criá-la quando a opção SIP a dispensa), minimiza superfície de erro e
requisitos de infraestrutura, e concentra o código no ciclo de vida, na
autorização e no registo — as partes centrais do produto. A Opção B fica
descartada para V1, mantendo os contratos (`TelephonyProvider`/`VoiceProvider`)
capazes de a acomodar no futuro.

⚠️ **Limitação honesta deste ambiente**: não há acesso de rede à
documentação oficial da OpenAI/Twilio nem credenciais. Por isso **nenhum
endpoint, modelo, nome de evento ou parâmetro de API de fornecedor foi
implementado ou inventado** (regra §3). Os adaptadores reais devem ser
escritos contra a documentação oficial da versão utilizada — ver
`apps/web/lib/voice/adapters/` e `docs/voice-setup.md`.

## 2. Fluxo da chamada recebida (Opção A)

```
Fornecedor telefónico (SIP)
        │  1. chamada recebida → webhook (assinado)
        ▼
POST /api/voice/webhooks/inbound
        │  2. assinatura verificada (fail-closed) · tamanho · replay · rate limit
        │  3. resolução: inbound_phone_number → agent → organization (persistido)
        │  4. criação IDEMPOTENTE da chamada (provider_call_id único)
        │  5. evento call.received persistido (dedup por provider_event_id)
        ▼
POST /api/voice/webhooks/status   (eventos do fornecedor)
        │  6. validação + dedup persistente
        │  7. CallLifecycleService: monotonia (fora de ordem não reverte)
        │  8. call.answered → voice_session_id + answered_at (NUNCA pelo webhook só)
        ▼
VoiceSessionService → VoiceProvider (sessão de voz com instruções do agente)
        │  9. fim/falha → call.ended/call.failed (idempotente)
        │ 10. duração/custos/failure_reason sanitizado
        ▼
Calls Center (estados reais persistidos) · logs correlacionados
```

Reforços: um webhook **não implica atendimento** (só `call.answered`);
WebSockets/sessões/buffers são libertados em todos os caminhos de saída;
chamadas transitórias abandonadas são reconciliadas por timeout
(`reconcileStaleCall`).

## 3. Módulos (PROMPT 07 §4)

| Módulo                    | Ficheiro                            | Papel                                                        |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Contratos                 | `apps/web/lib/voice/contracts.ts`   | `VoiceProvider`, `TelephonyProvider`, erros tipados          |
| CallLifecycleService      | `apps/web/lib/voice/lifecycle.ts`   | máquina de estados, monotonia, reconciliação                 |
| CallEventService          | `apps/web/lib/voice/events.ts`      | validação, dedup, sanitização de metadados                   |
| VoiceConfigurationService | `apps/web/lib/voice/config.ts`      | validação da configuração do agente + instruções endurecidas |
| VoiceWebhookService       | `apps/web/lib/voice/webhooks.ts`    | assinatura, replay, payload, rate limit, respostas tipadas   |
| Ingestão                  | `apps/web/lib/voice/ingestion.ts`   | persistência (service role) + resolução org/call             |
| Diagnóstico               | `apps/web/lib/voice/diagnostics.ts` | 6 estados de prontidão (UI)                                  |
| Adaptadores               | `apps/web/lib/voice/adapters/`      | HMAC genérico + adaptadores PENDENTES                        |

Frontend nunca fala com fornecedores; contratos de fornecedor não entram em
componentes React nem no modelo de domínio (`@orbita/shared` é neutro).

## 4. Comportamento de recusa/fallback (§7)

| Situação                               | Comportamento                                                             |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Agente pausado/arquivado/inativo       | Sessão recusada (`agent_not_ready`) — chamada falha com razão documentada |
| Configuração de voz inválida / sem voz | Recusa tipada antes de contactar o fornecedor                             |
| Fornecedor indisponível                | `provider_unavailable`; sem retries ilimitados; recursos libertados       |
| Credenciais ausentes                   | Estado «Não configurado» — nada é criado nem simulado                     |

## 5. Preparação para chamadas efetuadas (futuro)

O caminho de saída reutiliza `startCallAction` (Prompt 06) + `TelephonyProvider.dial`
a implementar; `provider_call_id` e `voice_session_id` já suportados no schema.
