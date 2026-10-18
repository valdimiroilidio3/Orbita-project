-- 0004_voice_engine.sql — Motor de voz IA (Prompt 07)
--
-- Estende `calls` e `agents` para o ciclo de vida de voz em tempo real e
-- cria `call_events` para o registo idempotente de eventos de fornecedor.
--
-- Requisitos (PROMPT 07 §5):
--   • voice_session_id, answered_at, failure_code, failure_reason em calls;
--   • eventos com unicidade anti-duplicação e sem escrita por cliente;
--   • sem áudio, transcrições completas ou payloads integrais por defeito;
--   • fora de ordem não reverte estados (garantido no serviço + trigger).
--
-- ⚠️ ESTADO: migração criada no repositório — NÃO aplicada a nenhuma
-- instância Supabase neste ambiente (ver docs/voice-setup.md).

-- ── calls: campos do motor de voz ─────────────────────────────

alter table public.calls
  add column if not exists voice_session_id text,
  add column if not exists answered_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failure_reason text;

-- Coerência temporal: atendimento nunca antes do início; fim nunca antes do atendimento.
alter table public.calls
  drop constraint if exists calls_answered_after_started_chk;
alter table public.calls
  add constraint calls_answered_after_started_chk
  check (answered_at is null or started_at is null or answered_at >= started_at);

alter table public.calls
  drop constraint if exists calls_ended_after_answered_chk;
alter table public.calls
  add constraint calls_ended_after_answered_chk
  check (ended_at is null or answered_at is null or ended_at >= answered_at);

-- failure_reason sanitizado: tamanho limitado (sem payloads integrais).
alter table public.calls
  drop constraint if exists calls_failure_reason_len_chk;
alter table public.calls
  add constraint calls_failure_reason_len_chk
  check (failure_reason is null or length(failure_reason) <= 500);

alter table public.calls
  drop constraint if exists calls_failure_code_len_chk;
alter table public.calls
  add constraint calls_failure_code_len_chk
  check (failure_code is null or length(failure_code) <= 64);

-- Índice para consultas de sessão de voz (diagnóstico/reconciliação).
create index if not exists calls_org_voice_session_idx
  on public.calls (organization_id, voice_session_id)
  where voice_session_id is not null;

-- ── agents: número de entrada para resolução de chamadas recebidas ──
-- Mapeamento persistido número → agente (a resolução NUNCA confia em
-- identificadores recebidos do fornecedor sem esta associação verificada).

alter table public.agents
  add column if not exists inbound_phone_number text;

alter table public.agents
  drop constraint if exists agents_inbound_phone_len_chk;
alter table public.agents
  add constraint agents_inbound_phone_len_chk
  check (inbound_phone_number is null or length(inbound_phone_number) <= 32);

drop index if exists agents_inbound_phone_uidx;
create unique index agents_inbound_phone_uidx
  on public.agents (inbound_phone_number)
  where inbound_phone_number is not null;

-- ── call_events: registo de eventos de fornecedor ─────────────
-- Imutável após inserção (sem updated_at: eventos não são editados).
-- Deduplicação persistente: unique (provider, provider_event_id).

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  call_id uuid not null,
  provider text not null check (length(provider) between 1 and 64),
  provider_event_id text not null check (length(provider_event_id) between 1 and 128),
  event_type text not null check (length(event_type) between 1 and 64),
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  -- FK composta impede associar eventos a chamadas de outra organização.
  constraint call_events_call_org_fk
    foreign key (organization_id, call_id)
    references public.calls (organization_id, id)
    on delete cascade
);

-- Chave única de chamadas (organization_id, id) para a FK composta acima.
alter table public.calls
  drop constraint if exists calls_org_id_uidx;
create unique index calls_org_id_uidx on public.calls (organization_id, id);

-- Deduplicação persistente de eventos (idempotência).
create unique index if not exists call_events_provider_event_uidx
  on public.call_events (provider, provider_event_id);

create index if not exists call_events_call_created_idx
  on public.call_events (call_id, created_at);

create index if not exists call_events_org_created_idx
  on public.call_events (organization_id, created_at desc);

-- Metadados: objeto pequeno, sem áudio/transcrições (limite de tamanho).
alter table public.call_events
  drop constraint if exists call_events_metadata_size_chk;
alter table public.call_events
  add constraint call_events_metadata_size_chk
  check (pg_column_size(metadata) <= 2048);

-- ── RLS de call_events ────────────────────────────────────────
-- Leitura para membros da organização; escrita NUNCA por cliente
-- autenticado (eventos de fornecedor são ingeridos pelo servidor,
-- ver docs/voice-security.md). Denegação por omissão.

alter table public.call_events enable row level security;

drop policy if exists "Members can view their call events" on public.call_events;
create policy "Members can view their call events"
on public.call_events
for select
to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = call_events.organization_id
      and m.user_id = (select auth.uid())
  )
);

-- Sem políticas INSERT/UPDATE/DELETE para `authenticated` — denegação por
-- omissão. A ingestão de webhooks ocorre no servidor com a service role
-- (caminho privilegiado de sistema, nunca no browser).

-- ── Guarda adicional: eventos não revertem estados (fora de ordem) ──
-- Reaproveita a lógica do calls_guard: qualquer UPDATE de status que
-- tente regredir de estado terminal ou voltar a queued já é bloqueado.
-- O serviço de ciclo de vida aplica a monotonia completa do produto.
