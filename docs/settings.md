# Definições (`/settings`)

Centro de controlo da conta e da organização. Princípio: **implementar o que o backend suporta; para o resto, estado honesto com o requisito em falta** (componente `PendingNotice`). Nada é simulado.

## Estrutura

| Rota                      | Conteúdo                                                                                        | Escrita                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/settings`               | Visão geral (org, membros, agentes, integrações, segurança, última atualização) + acesso rápido | —                                                                                             |
| `/settings/profile`       | Nome de apresentação, pedido de alteração de email, dados da conta                              | `updateProfileAction` (user_metadata.name), `requestEmailChangeAction` (confirmação Supabase) |
| `/settings/organization`  | Nome, website, país; perfil comercial (reutiliza `BusinessProfileForm`); info                   | `saveOrganizationGeneralAction` (owner/admin)                                                 |
| `/settings/members`       | Tabela de membros (RPC), alterar papel, remover/sair; convites pendentes                        | `changeMemberRoleAction`, `removeMemberAction`                                                |
| `/settings/security`      | Estado do email, MFA/sessões (não disponíveis), palavra-passe, ações críticas                   | `changePasswordAction`, `signOutAction`, `signOutEverywhereAction` (scope global)             |
| `/settings/notifications` | Preferências pessoais e da organização (guardadas; envio pendente)                              | `saveUserNotificationsAction`, `saveOrganizationNotificationsAction`                          |
| `/settings/voice`         | Estado dos fornecedores, defaults globais (idioma, duração, política de gravação), diagnóstico  | `saveOrganizationVoiceAction` (owner/admin; gravação exige confirmação)                       |
| `/settings/integrations`  | 6 integrações com requisitos, última verificação e sonda real ao Supabase                       | —                                                                                             |
| `/settings/usage`         | Chamadas recebidas/efetuadas, minutos, por agente (30 dias); sem custos inventados              | —                                                                                             |
| `/settings/billing`       | «Faturação ainda não configurada» — sem planos, preços ou faturas                               | —                                                                                             |
| `/settings/preferences`   | Idioma, fuso pessoal, tema, formatos (guardados; tema escuro/EN ainda sem efeito)               | `saveUserPreferencesAction`                                                                   |

`/billing` (rota antiga) redireciona para `/settings/billing`. `/integrations` mantém-se.

## Camadas

- `packages/shared/src/settings.ts` — tipos, schemas Zod e regras puras de membros (`evaluateRoleChange`, `evaluateRemoval`) com testes.
- `apps/web/lib/server/settings.ts` — leituras sob RLS, `probeSupabase()` (verificação operacional real).
- `apps/web/lib/server/settings-actions.ts` — server actions: `requireUser` → organização ativa → papel → Zod → Supabase. Logs estruturados sem dados sensíveis.
- `apps/web/components/settings/*` — `SettingsForm` (pending, dirty state, `beforeunload`, Guardar/Cancelar, erros por campo via contexto), `SettingsNav`, `SettingsSection`/`SettingRow`/`PendingNotice`, formulários por secção, `MembersTable` com diálogo de confirmação («remover»).

## Dados (migração `0006_settings.sql` — criada, NÃO aplicada)

- `user_preferences` (1:1 utilizador): locale, timezone, theme, formatos, 5 flags de notificação. RLS: só o próprio.
- `organization_settings` (1:1 organização): website, country, `default_language`, `max_call_duration_seconds`, `recording_enabled` (default **false**), `retention_days`, 2 flags de notificação, `updated_by`. RLS: membros leem; owner/admin escrevem; `organization_id` imutável por trigger.
- `list_organization_members(uuid)` — SECURITY DEFINER (acesso a `auth.users.email`), filtra por `is_org_member`, devolve apenas user_id/email/nome/papel/data.
- Não duplicado: nome comercial, fuso da organização, contactos continuam em `business_profiles`; nome da organização em `organizations`.

Sem a migração aplicada: leituras caem em defaults, gravações devolvem «A migração 0006 ainda não foi aplicada», membros mostram `PendingNotice`.

## Regras de membros (servidor + BD)

Espelham `memberships_guard` (0002): ninguém altera o próprio papel; só owner atribui/altera owner; último owner nunca é removido/despromovido; admin não remove owner; member só pode sair. A UI apenas esconde ações não permitidas; servidor e trigger validam sempre.

## Pendente (honesto na UI)

Convites por email, MFA, listagem de sessões, avatar (storage), eliminação de conta/organização, envio efetivo de notificações, tema escuro, interface em inglês, voz predefinida (depende de fornecedor), gravação efetiva/retenção automática, planos/custos/faturação.
