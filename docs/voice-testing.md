# ORBITA CHAT — Testes do Motor de Voz (voice-testing.md)

> Regra (PROMPT 07 §15): **mocks só em testes unitários e não contam como
> prova de integração real**. Nenhum teste é declarado passado sem ser
> executado. Testes bloqueados por credenciais/infraestrutura são registados.

## 1. Testes unitários executados — `pnpm test` (ficheiro `voice-engine.test.ts`)

| Área | Cenários cobertos |
| --- | --- |
| Ciclo de vida | criação (received), início de sessão (answered + voice_session_id), terminação normal (duração coerente), falha de sessão, desconexão → failed idempotente, **fora de ordem não reverte**, evento stale ignorado, repetição idempotente, busy/no_answer |
| Reconciliação | timeout de estados transitórios → failed `timeout_reconciliation`; não toca em prazos/terminais |
| Webhooks | **assinatura inválida → 401**, **payload inválido → 400**, **payload grande → 413**, **replay → 409**, evento válido normalizado, **duplicado → dedup (23505)**, **desconhecido tratado em segurança**, adaptador pendente fail-closed |
| Rate limit/replay | janela deslizante por IP; janela anti-replay |
| Configuração | válida; **sem voz**; **pausado/arquivado**; credenciais ausentes (nada criado); instruções endurecidas |
| Metadados | allowlist + escalares (sem segredos/payloads) |
| Diagnóstico | os 6 estados, incluindo «ligação verificada» só com chamada real |
| Ambiente | variáveis em falta/inválidas → não configurado/falha de configuração |
| Assinaturas HMAC | aceita válida, rejeita segredo errado (tempo constante) |

## 2. Testes de integração de base de dados — `supabase test db` (pgTAP)

`supabase/tests/rls.test.sql` (17 asserções) inclui `call_events`:
isolamento de leitura entre organizações, denegação de escrita por cliente
autenticado, unicidade anti-duplicação.

⚠️ **ESTADO: PREPARADOS, NÃO EXECUTADOS** — este ambiente não tem
PostgreSQL/Supabase disponível. Executar com `supabase db reset && supabase test db`.

## 3. Testes bloqueados (sem credenciais/infraestrutura)

| Teste | Motivo |
| --- | --- |
| Chamada telefónica real ponta a ponta | Sem credenciais de fornecedor/telefonia e sem autorização para chamadas pagas |
| Verificação de assinatura do fornecedor (esquema real) | Esquema por confirmar na documentação oficial (acesso de rede bloqueado a fornecedores neste ambiente) |
| Sessão de voz em tempo real (OpenAI) | Sem `OPENAI_API_KEY` |
| Ordem de eventos de áudio, codec/formato, interrupção, fecho de WebSocket, limites de buffer | Só existem com a ponte de áudio (Opção B, descartada para V1) ou com o canal de controlo real (Opção A) — **não aplicáveis à integração pendente** |
| Falha de persistência e recuperação em produção | Exige instância Supabase real |
| Métricas de tempo até atendimento/primeira áudio | Sem dados reais — **não medidas** (não inventadas) |

## 4. Verificação manual executada neste ambiente

- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` — ver relatório final.
- Webhooks sem fornecedor configurado → respostas 503/401 fail-closed (smoke HTTP).
- Painel de diagnóstico apresenta «Não configurado» sem credenciais.

## 5. Como reproduzir

```bash
pnpm test                 # unitários (mocks identificados)
supabase test db          # pgTAP (requer Docker/Supabase local)
pnpm build && pnpm start  # smoke manual em http://localhost:3000
```
