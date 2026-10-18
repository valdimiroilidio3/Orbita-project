import { z } from 'zod';

import { phoneNumberSchema } from './validation';

/**
 * AI Tool Calling — domínio partilhado (PROMPT 08).
 *
 * INDEPENDENTE do fornecedor de voz/IA: nenhum contrato de Twilio, SIP ou
 * OpenAI entra neste módulo. O catálogo é allowlisted — nunca execução
 * arbitrária de código, SQL, URLs ou chamadas HTTP definidas pelo modelo.
 */

/* ── Identificadores, risco e estados ───────────────────────── */

export const TOOL_IDS = [
  'business_info.lookup',
  'availability.check',
  'contact_request.create',
  'appointment.create',
  'call.transfer',
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export const TOOL_RISK_LEVELS = ['low', 'moderate', 'high'] as const;
export type ToolRiskLevel = (typeof TOOL_RISK_LEVELS)[number];

/** Confirmação exigida: nenhuma · verbal do interlocutor · aprovação humana. */
export const TOOL_CONFIRMATION_POLICIES = ['none', 'caller_verbal', 'human_approval'] as const;
export type ToolConfirmationPolicy = (typeof TOOL_CONFIRMATION_POLICIES)[number];

/** Estados de uma execução de ferramenta. */
export const TOOL_EXECUTION_STATUSES = [
  'pending',
  'awaiting_approval',
  'running',
  'succeeded',
  'failed',
  'canceled',
  'timed_out',
] as const;
export type ToolExecutionStatus = (typeof TOOL_EXECUTION_STATUSES)[number];

/** Resultados estruturados devolvidos ao agente (PROMPT 08 §12). */
export const TOOL_RESULT_STATUSES = [
  'success',
  'validation_error',
  'unauthorized',
  'approval_required',
  'not_found',
  'conflict',
  'rate_limited',
  'timeout',
  'provider_unavailable',
  'unsupported',
  'internal_error',
] as const;
export type ToolResultStatus = (typeof TOOL_RESULT_STATUSES)[number];

export interface ToolResult {
  status: ToolResultStatus;
  /** Mensagem breve para o agente comunicar — nunca internos/segredos. */
  message: string;
  /** Dados estruturados mínimos (sanitizados). */
  data?: Record<string, string | number | boolean>;
}

/* ── Definições das ferramentas ─────────────────────────────── */

export interface ToolDefinition {
  id: ToolId;
  name: string;
  /** Descrição exposta ao agente de voz. */
  descriptionForAgent: string;
  category: 'informação' | 'disponibilidade' | 'contacto' | 'marcações' | 'chamada';
  risk: ToolRiskLevel;
  confirmation: ToolConfirmationPolicy;
  timeoutMs: number;
  /** Se a operação é naturalmente idempotente (chave exigida quando não). */
  idempotent: boolean;
  retryPolicy: 'none' | 'safe';
}

export const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  'business_info.lookup': {
    id: 'business_info.lookup',
    name: 'Consultar informações da empresa',
    descriptionForAgent:
      'Consulta informação pública autorizada da empresa (horário, serviços, preços, morada, contactos, FAQ, políticas).',
    category: 'informação',
    risk: 'low',
    confirmation: 'none',
    timeoutMs: 5_000,
    idempotent: true,
    retryPolicy: 'safe',
  },
  'availability.check': {
    id: 'availability.check',
    name: 'Consultar disponibilidade',
    descriptionForAgent:
      'Consulta horários livres reais para um serviço numa data. Nunca inventa disponibilidade.',
    category: 'disponibilidade',
    risk: 'low',
    confirmation: 'none',
    timeoutMs: 5_000,
    idempotent: true,
    retryPolicy: 'safe',
  },
  'contact_request.create': {
    id: 'contact_request.create',
    name: 'Criar pedido de contacto',
    descriptionForAgent:
      'Regista um pedido para a equipa contactar o interlocutor. Confirma verbalmente APENAS depois de o registo ser criado.',
    category: 'contacto',
    risk: 'moderate',
    confirmation: 'caller_verbal',
    timeoutMs: 10_000,
    idempotent: false,
    retryPolicy: 'none',
  },
  'appointment.create': {
    id: 'appointment.create',
    name: 'Criar marcação',
    descriptionForAgent:
      'Reserva um horário. Confirma ao interlocutor APENAS depois de o sistema de reservas confirmar o sucesso.',
    category: 'marcações',
    risk: 'moderate',
    confirmation: 'caller_verbal',
    timeoutMs: 15_000,
    idempotent: false,
    retryPolicy: 'none',
  },
  'call.transfer': {
    id: 'call.transfer',
    name: 'Transferir chamada',
    descriptionForAgent:
      'Solicita transferência para um destino autorizado. Se não for suportado, oferece criar um pedido de contacto.',
    category: 'chamada',
    risk: 'moderate',
    confirmation: 'none',
    timeoutMs: 10_000,
    idempotent: true,
    retryPolicy: 'none',
  },
};

/** Nível de risco configurável por ferramenta — NUNCA reduzido pelo modelo. */
export const MINIMUM_TOOL_RISK: Record<ToolId, ToolRiskLevel> = {
  'business_info.lookup': 'low',
  'availability.check': 'low',
  'contact_request.create': 'moderate',
  'appointment.create': 'moderate',
  'call.transfer': 'moderate',
};

export function effectiveToolRisk(
  toolId: ToolId,
  configuredRisk: ToolRiskLevel | null | undefined,
): ToolRiskLevel {
  const minimum = MINIMUM_TOOL_RISK[toolId];
  const order: Record<ToolRiskLevel, number> = { low: 0, moderate: 1, high: 2 };
  if (!configuredRisk) return minimum;
  // O risco configurado nunca pode ficar abaixo do mínimo da ferramenta.
  return order[configuredRisk] < order[minimum] ? minimum : configuredRisk;
}

/* ── Esquemas de argumentos (validados sempre no servidor) ──── */

export const BUSINESS_INFO_SECTIONS = [
  'hours',
  'services',
  'prices',
  'address',
  'contacts',
  'faq',
  'policies',
] as const;
export type BusinessInfoSection = (typeof BUSINESS_INFO_SECTIONS)[number];

export const businessInfoLookupArgsSchema = z.object({
  section: z.enum(BUSINESS_INFO_SECTIONS).optional(),
});

export const availabilityCheckArgsSchema = z.object({
  service: z.string().trim().min(1, 'Serviço é obrigatório').max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
  timezone: z.string().trim().min(1).max(64),
  durationMinutes: z.coerce.number().int().min(5).max(480),
});

export const contactRequestCreateArgsSchema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: phoneNumberSchema,
  reason: z.string().trim().min(1, 'Motivo é obrigatório').max(500),
  preferredPeriod: z.string().trim().max(120).optional(),
});

export const appointmentCreateArgsSchema = z.object({
  service: z.string().trim().min(1, 'Serviço é obrigatório').max(120),
  startsAt: z.iso.datetime('Data/hora inválida'),
  timezone: z.string().trim().min(1).max(64),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  customerName: z.string().trim().max(120).optional(),
  customerPhone: phoneNumberSchema,
  /** Confirmação verbal do interlocutor — não substitui autenticação forte. */
  confirmedByCaller: z.boolean().default(false),
});

export const callTransferArgsSchema = z.object({
  /**
   * Destino é uma ROTA autorizada (extensão/fila definida pela organização)
   * — nunca um número inventado pelo modelo.
   */
  destination: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_-]{1,63}$/, 'Destino deve ser uma rota autorizada (ex.: recepcao), nunca um número'),
});

export const TOOL_ARGS_SCHEMAS = {
  'business_info.lookup': businessInfoLookupArgsSchema,
  'availability.check': availabilityCheckArgsSchema,
  'contact_request.create': contactRequestCreateArgsSchema,
  'appointment.create': appointmentCreateArgsSchema,
  'call.transfer': callTransferArgsSchema,
} as const;

/** Limite de tamanho dos argumentos (PROMPT 08 §6). */
export const TOOL_ARGS_MAX_BYTES = 8192;

/* ── Template de argumentos de workflows (allowlist) ─────────── */

/**
 * Placeholders permitidos em passos de workflow — substituídos por valores
 * CONHECIDOS DO SERVIDOR (nunca caminhos arbitrários nem dados de outras
 * organizações). O restante texto passa literal.
 */
export const WORKFLOW_PLACEHOLDERS = {
  '{{call.fromNumber}}': (ctx: WorkflowTriggerContext) => ctx.callFromNumber ?? '',
  '{{call.toNumber}}': (ctx: WorkflowTriggerContext) => ctx.callToNumber ?? '',
  '{{call.id}}': (ctx: WorkflowTriggerContext) => ctx.callId ?? '',
  '{{contact.phone}}': (ctx: WorkflowTriggerContext) => ctx.contactPhone ?? '',
  '{{contact.name}}': (ctx: WorkflowTriggerContext) => ctx.contactName ?? '',
} as const;

export interface WorkflowTriggerContext {
  callId: string | null;
  callFromNumber: string | null;
  callToNumber: string | null;
  contactPhone: string | null;
  contactName: string | null;
}

export function renderWorkflowArgs(
  value: unknown,
  context: WorkflowTriggerContext,
): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [placeholder, resolve] of Object.entries(WORKFLOW_PLACEHOLDERS)) {
      result = result.split(placeholder).join(resolve(context));
    }
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => renderWorkflowArgs(item, context));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = renderWorkflowArgs(item, context);
    }
    return result;
  }
  return value;
}

/** Determina se um placeholder é da allowlist (anti prompt injection). */
export function validateWorkflowArgsPlaceholder(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(WORKFLOW_PLACEHOLDERS, value);
}

/* ── Workflows (PROMPT 08 §8) ───────────────────────────────── */

/**
 * Gatilhos suportados por eventos REAIS já existentes (ciclo de vida de
 * chamadas + criação de contactos/marcações). Nenhum gatilho depende de
 * eventos inexistentes.
 */
export const AUTOMATION_TRIGGERS = [
  'call.received',
  'call.completed',
  'call.failed',
  'call.no_answer',
  'call.busy',
  'contact_request.created',
  'appointment.created',
] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_RUN_STATUSES = [
  'running',
  'succeeded',
  'partial',
  'failed',
  'timed_out',
] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

export const automationStepSchema = z.object({
  toolId: z.enum(TOOL_IDS),
  args: z.record(z.string(), z.unknown()),
});

export const automationWorkflowSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120),
  description: z.string().trim().max(500).nullish(),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  active: z.boolean().default(true),
  steps: z
    .array(automationStepSchema)
    .min(1, 'Pelo menos um passo')
    .max(5, 'Máximo de 5 passos por workflow'),
  timeoutSeconds: z.coerce.number().int().min(5).max(120).default(30),
});

export type AutomationWorkflowInput = z.infer<typeof automationWorkflowSchema>;

/** Limite total de execuções de ferramentas por workflow (anti-ciclos). */
export const WORKFLOW_MAX_TOOL_EXECUTIONS = 5;

/* ── Perfil público da empresa (dados das ferramentas A/B/D) ── */

export const businessProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).default(''),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .default('Europe/Lisbon'),
  address: z.string().trim().max(300).nullish(),
  phone: z.string().trim().max(32).nullish(),
  email: z.string().trim().max(254).nullish(),
  prices: z.string().trim().max(2000).nullish(),
  faq: z.string().trim().max(4000).nullish(),
  policies: z.string().trim().max(2000).nullish(),
  /**
   * Horário em texto compacto, ex.:
   *   seg:09:00-13:00,14:00-18:00; ter:09:00-18:00; sab:fechado; dom:fechado
   */
  hoursText: z.string().trim().max(1000).default(''),
  /**
   * Serviços em linhas "Nome | duração_min | preço_opcional", ex.:
   *   Consulta geral | 30 | 25€
   */
  servicesText: z.string().trim().max(2000).default(''),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface TimeRange {
  start: string;
  end: string;
}

export type BusinessHours = Partial<Record<Weekday, TimeRange[]>>;

export interface BusinessService {
  name: string;
  durationMinutes: number;
  price: string | null;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Analisa o horário compacto — erros claros, nunca horários inventados. */
export function parseBusinessHours(text: string):
  | { ok: true; value: BusinessHours }
  | { ok: false; error: string } {
  const value: BusinessHours = {};
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value };

  const seen = new Set<string>();
  for (const segment of trimmed.split(';')) {
    const piece = segment.trim();
    if (piece === '') continue;
    const separator = piece.indexOf(':');
    if (separator <= 0) return { ok: false, error: `Segmento inválido: «${piece}»` };

    const day = piece.slice(0, separator).trim().toLowerCase();
    if (!(WEEKDAYS as readonly string[]).includes(day)) {
      return { ok: false, error: `Dia desconhecido: «${day}» (usa seg..dom)` };
    }
    if (seen.has(day)) return { ok: false, error: `Dia repetido: «${day}»` };
    seen.add(day);

    const body = piece.slice(separator + 1).trim().toLowerCase();
    if (body === 'fechado' || body === 'closed') {
      value[day as Weekday] = [];
      continue;
    }

    const ranges: TimeRange[] = [];
    for (const range of body.split(',')) {
      const [start, end] = range.trim().split('-');
      if (!start || !end || !isValidTime(start.trim()) || !isValidTime(end.trim())) {
        return { ok: false, error: `Intervalo inválido em «${day}»: «${range}»` };
      }
      if (start.trim() >= end.trim()) {
        return { ok: false, error: `Início deve ser anterior ao fim em «${day}»` };
      }
      ranges.push({ start: start.trim(), end: end.trim() });
    }
    value[day as Weekday] = ranges;
  }
  return { ok: true, value };
}

/** Analisa as linhas de serviços — nunca inventa serviços. */
export function parseServiceLines(text: string):
  | { ok: true; value: BusinessService[] }
  | { ok: false; error: string } {
  const value: BusinessService[] = [];
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value };

  for (const line of trimmed.split('\n')) {
    const piece = line.trim();
    if (piece === '') continue;
    const parts = piece.split('|').map((part) => part.trim());
    const [name, rawDuration, rawPrice] = parts;
    if (!name || !rawDuration) {
      return { ok: false, error: `Linha inválida: «${piece}» (usa Nome | duração | preço)` };
    }
    const durationMinutes = Number(rawDuration);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
      return { ok: false, error: `Duração inválida em «${name}» (5..480 minutos)` };
    }
    value.push({
      name: name.slice(0, 120),
      durationMinutes,
      price: rawPrice && rawPrice !== '' ? rawPrice.slice(0, 40) : null,
    });
  }
  return { ok: true, value };
}

/* ── Disponibilidade (pura — nunca inventa horários) ────────── */

export interface BusyInterval {
  start: string;
  end: string;
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calcula slots livres REAIS: horas de expediente menos marcações existentes.
 * Sem expediente nesse dia → vazio («indisponível»), nunca horários fictícios.
 */
export function computeAvailableSlots(params: {
  hours: TimeRange[];
  busy: BusyInterval[];
  durationMinutes: number;
  slotMinutes?: number;
  /** Limite de slots devolvidos. */
  limit?: number;
}): string[] {
  const slot = params.slotMinutes ?? 30;
  const limit = params.limit ?? 12;
  const busyMinutes = params.busy.map((interval) => ({
    start: toMinutes(interval.start),
    end: toMinutes(interval.end),
  }));

  const slots: string[] = [];
  for (const range of params.hours) {
    const rangeStart = toMinutes(range.start);
    const rangeEnd = toMinutes(range.end);
    for (let start = rangeStart; start + params.durationMinutes <= rangeEnd; start += slot) {
      const end = start + params.durationMinutes;
      const overlaps = busyMinutes.some((interval) => start < interval.end && end > interval.start);
      if (!overlaps && slots.length < limit) {
        slots.push(toTime(start));
      }
      if (slots.length >= limit) break;
    }
    if (slots.length >= limit) break;
  }
  return slots;
}

/** Dia da semana (seg..dom) de uma data AAAA-MM-DD, independente de locale. */
export function weekdayOf(date: string): Weekday | null {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const index = parsed.getUTCDay(); // 0=dom..6=sáb
  return (['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const)[index] ?? null;
}
