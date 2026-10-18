# Testes — ferramentas e automações (PROMPT 08 §14)

Regra: mocks são **testes unitários**, nunca prova de integração externa.

## Executados (vitest, 2026-10-18) — 160/160 (37 novos)

`apps/web/tests/tool-engine.test.ts` (29) · `apps/web/tests/workflow-engine.test.ts` (8)

| categoria do prompt            | teste                                                                   | estado |
| ------------------------------ | ----------------------------------------------------------------------- | ------ |
| Ferramenta inexistente         | `not_found` sem execução                                                | ✅     |
| Argumentos inválidos           | 5 schemas + executor `validation_error`                                 | ✅     |
| Ferramenta inativa             | `agent_tools` ausente → `unauthorized`                                  | ✅     |
| Agente sem permissão           | `enabled=false` → `unauthorized`                                        | ✅     |
| Resultado de sucesso           | estruturado, persistido (`exec-1`)                                      | ✅     |
| Falha do adaptador             | `DevBookingAdapter` → `conflict`, sem sucesso simulado                  | ✅     |
| Idempotência — pedido repetido | handler + executor (`replayed: true`)                                   | ✅     |
| Idempotência — chave estável   | `deriveIdempotencyKey`                                                  | ✅     |
| Aprovações (4)                 | válida / expirada / não autorizada / operação diferente (+ já decidida) | ✅     |
| Workflows — ordem              | 2 passos em sequência → `succeeded`                                     | ✅     |
| Workflows — falha num passo    | interrompe → `failed`                                                   | ✅     |
| Workflows — limite de passos   | 6.º rejeitado pelo schema                                               | ✅     |
| Workflows — timeout            | relógio avançado → `timed_out`                                          | ✅     |
| Workflows — desativado         | sem execução                                                            | ✅     |
| Workflows — reentrada          | unique violation → `skipped`                                            | ✅     |
| Disponibilidade                | sem expediente → sem slots; erro técnico ≠ indisponível; TZ inválido    | ✅     |
| Transferência                  | número arbitrário rejeitado; `unsupported` com alternativa              | ✅     |
| Risco                          | nunca reduzido abaixo do mínimo                                         | ✅     |
| Placeholders                   | só allowlist substituída                                                | ✅     |

## Preparados, NÃO executados (sem PostgreSQL/Supabase neste ambiente)

pgTAP `supabase/tests/rls.test.sql` (plan 22), testes 18–22: acesso cruzado a execuções, leitura
pela própria organização, membro não altera `agent_tools`, membro não aprova nem escreve
execuções, owner alheio não altera aprovações. Correr: `supabase start && supabase db reset && supabase test db`.

## Bloqueados (dependem de fornecedor/credenciais)

- Integração de voz: resultado no formato do fornecedor; falha comunicada ao agente; ferramenta
  indisponível; chamada terminada durante execução — **sem adaptador de tool calling** (nenhum
  formato de payload é inventado). A camada de domínio cobre o equivalente (`ToolResult` tipado,
  `unsupported`, `timeout`).
- Timeout com resultado externo desconhecido / duas execuções concorrentes contra sistema externo —
  só testáveis com adaptador real; protegidos por `idempotency_key` único e `timed_out` sem retry.
- Evento de chamada duplicado — coberto no Prompt 07 (dedup `call_events`) + `automation_runs` único.

## Verificações

`pnpm typecheck` ✅ · `pnpm lint` ✅ (0 erros/0 avisos) · `pnpm test` ✅ 160/160 · `pnpm build` ✅ ·
SQL 0005 + rls.test.sql validados sintaticamente.
