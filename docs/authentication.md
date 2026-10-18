# ORBITA CHAT — Autenticação (Supabase Auth + SSR)

## 1. Fluxo

```
Browser ──> Next.js (middleware atualiza sessão) ──> Supabase Auth
                 │
                 ├── Server Components/Actions validam sessão (getUser)
                 └── Queries passam por RLS (auth.uid() no JWT)
```

- **Sessão**: cookies httpOnly geridos por `@supabase/ssr` (nunca em
  localStorage por nossa iniciativa; tokens nunca expostos a JS).
- **Middleware** (`apps/web/middleware.ts`): refresh de sessão + redireciona
  utilizadores sem sessão das rotas privadas para `/login`.
- **Proteção server-side** (`app/(dashboard)/layout.tsx`): `getUser()` +
  verificação de organização em cada request — defesa em profundidade (o
  middleware não é a única camada).

## 2. Páginas e rotas

| Rota | Função |
| --- | --- |
| `/login` | `signInWithPassword` — erro genérico («Credenciais inválidas»), sem revelar emails registados |
| `/register` | `signUp` — mensagem genérica de confirmação de email (anti-enumeración) |
| `/forgot-password` | `resetPasswordForEmail` — resposta sempre igual, com ou sem conta |
| `/reset-password` | `updateUser` (via sessão de recuperação) |
| `/auth/callback` | troca `code` por sessão (links de email/OAuth) — proteção contra open redirect |
| `/auth/confirm` | `verifyOtp` (token_hash) para os templates de email do Supabase |
| Logout | server action `signOutAction` (menu de utilizador) |

Com o Supabase **não configurado**, nenhuma autenticação é simulada: os
formulários mostram instruções de configuração e o dashboard corre em modo de
demonstração identificado.

## 3. Organização ativa e onboarding

1. Após autenticação sem memberships → `/onboarding`.
2. Criação via RPC transacional `create_organization` (validação Zod no servidor
   + validação SQL; owner = `auth.uid()`; atomicidade garantida).
3. Organização ativa guardada em cookie `orbita_active_org` (httpOnly) como
   **preferência**; validada no servidor em cada request contra as memberships
   (query RLS). Manipular o cookie não concede acesso — o RLS é a autoridade.

## 4. Configuração local

1. Cria um projeto em [supabase.com](https://supabase.com) (ou `supabase init` + `supabase start` para local).
2. Copia `apps/web/.env.example` → `apps/web/.env.local` e preenche:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave anon/publishable
   - `SUPABASE_SERVICE_ROLE_KEY` — **opcional**; apenas operações
     administrativas de servidor; nunca obrigatória para o fluxo normal.
3. Aplica as migrações: `supabase db push` (ou `supabase db reset` local).
4. No dashboard Supabase → Authentication → URL Configuration: define
   `Site URL` = `http://localhost:3000` e adiciona
   `http://localhost:3000/auth/callback` a Redirect URLs.
5. (Opcional) Templates de email: aponta confirmação/recuperação para
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   e recuperação para `{{ .SiteURL }}/auth/callback?next=/reset-password`.
6. `pnpm dev` → `/register` cria a primeira conta → `/onboarding` cria a organização.

## 5. Regras de segurança aplicadas

- Palavras-passe geridas exclusivamente pelo Supabase Auth (mínimo 8 caracteres).
- Mensagens de login/recuperação/registo não revelam existência de contas.
- Validação de inputs no cliente (UX) **e** no servidor (Zod) **e** na base de dados (CHECK/RLS).
- `next` de redirecionamentos aceita apenas caminhos internos (anti open-redirect).
- Sem segredos no Git; `SUPABASE_SERVICE_ROLE_KEY` nunca chega ao browser.
