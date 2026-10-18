# ORBITA CHAT — Motor de chamadas (Prompt 06)

> Ciclo de vida de chamadas com **simulador local** — sem telefonia real.
> Domínio: `CALL_STATUS_TRANSITIONS` (`@orbita/shared`). Motor: `apps/web/lib/calls.ts`.
> Ações: `apps/web/lib/server/call-actions.ts`. UI: `apps/web/app/(dashboard)/calls/*`.

## Ciclo de vida

```
queued → initiating → ringing → in_progress → completed
   │          │           │  ├──────────────┼── failed / transferred
   │          │           └── no_answer / busy
   └──────────┴── cancelled (possível de qualquer estado não terminal)
```

- Estados terminais (`completed`, `failed`, `busy`, `no_answer`, `cancelled`,
  `transferred`) **não transitam** — validado no produto (TS) e na BD
  (trigger `calls_guard`; a BD impõe o piso, o produto o fluxo completo).
- Sem regressão a `queued`.
- Duração = tempo real decorrido entre início e fim; coerência
  `started_at ≤ ended_at` garantida por CHECK na BD.

## Simulador local (o que existe nesta fase)

- `provider = 'simulado'` em todos os registos criados — badge **«Simulada»**
  sempre visível na UI; nunca é apresentado como telefonia real.
- Fluxo: «Nova chamada» (agente **ativo** + destino) → a chamada nasce em
  `queued` e o simulador conduz `initiating → ringing → in_progress` →
  o utilizador **termina** (duração = tempo real) ou **cancela**.
- Custo estimado: **0,02 €/minuto** proporcional — estimativa do simulador,
  nunca um valor de faturação real.
- Resultados alternativos (`no_answer`, `busy`, `failed`, `transferred`) são
  válidos na máquina de estados e cobertos por testes; o simulador feliz não
  os produz — a telefonia real mapeará os resultados do fornecedor.

## O que é preciso para a primeira chamada REAL (não ativado)

1. **Credenciais de telefonia** (ex.: Twilio — `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`), apenas no servidor; nunca
   `NEXT_PUBLIC_`, nunca no browser, nunca commitadas.
2. **Implementação `CallProvider`** para o fornecedor (iniciar, estado,
   desligar) que substitua o simulador no `startCallAction`; a interface e o
   ponto de troca estão isolados em `lib/server/call-actions.ts` + `lib/calls.ts`.
3. **Webhooks do fornecedor** → route handler que atualiza estados
   (ringing/completed/failed…) validando assinatura; é trabalho do `apps/api`
   (NestJS) quando a telefonia for real — o frontend nunca chama fornecedores.
4. **Voz/IA** (ex.: OpenAI) para conversação — fora do âmbito atual; as
   instruções do agente já estão guardadas para esse fim.

⚠️ Nada disto está configurado ou testado neste ambiente — **não há
integrações ativas** e nenhuma chamada real foi feita.

## Segurança e dados

- `organization_id` sempre da sessão validada; queries sujeitas a RLS
  (membros só veem chamadas da própria organização).
- Números de telefone são **privados** — expostos apenas a membros via RLS.
- Histórico retido: eliminar um agente não apaga chamadas (`agent_id → NULL`).
- Estados finais imutáveis — histórico operacional/financeiro preservado.

## Testes

`apps/web/tests/call-engine.test.ts` — máquina de estados (caminho feliz,
terminais imutáveis, sem regressão à fila), validação de números, custo e
coerência de duração, controlos de UI. Executar com `pnpm test`.
