import { z } from 'zod';

import {
  AGENT_STATUSES,
  CALL_DIRECTIONS,
  CALL_STATUSES,
  ORGANIZATION_ROLES,
  SUPPORTED_CURRENCIES,
} from './domain';

/**
 * Validações comuns (Zod). Servem o frontend e, no futuro, a API.
 * Nenhum destes schemas substitui validação no servidor.
 */

export const organizationRoleSchema = z.enum(ORGANIZATION_ROLES);
export const agentStatusSchema = z.enum(AGENT_STATUSES);
export const callDirectionSchema = z.enum(CALL_DIRECTIONS);
export const callStatusSchema = z.enum(CALL_STATUSES);
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

/**
 * Configuração de voz/operacional do agente.
 *
 * Apenas campos estruturados e NUNCA segredos de fornecedores: o schema é
 * `strict` — qualquer chave não suportada (api keys, tokens, etc.) é rejeitada.
 * Segredos de fornecedores pertencem a variáveis de ambiente do servidor.
 */
export const voiceConfigSchema = z.strictObject({
  voiceId: z
    .string()
    .trim()
    .max(64, 'Identificador de voz demasiado longo')
    .optional(),
  speed: z
    .number()
    .min(0.5, 'Velocidade entre 0.5 e 2')
    .max(2, 'Velocidade entre 0.5 e 2')
    .optional(),
  pitch: z.number().min(-1, 'Tom entre -1 e 1').max(1, 'Tom entre -1 e 1').optional(),
  greeting: z.string().trim().max(500, 'Saudação máxima de 500 caracteres').optional(),
  style: z.string().trim().max(120, 'Estilo máximo de 120 caracteres').optional(),
});

export type VoiceConfigInput = z.infer<typeof voiceConfigSchema>;

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo de 120 caracteres'),
  description: z.string().trim().max(2000).nullish(),
  instructions: z.string().max(20000, 'Instruções: máximo de 20 000 caracteres').default(''),
  language: z
    .string()
    .trim()
    .min(2, 'Código de idioma inválido')
    .max(16, 'Código de idioma inválido')
    .default('pt-PT'),
  status: agentStatusSchema.default('draft'),
  voiceConfig: voiceConfigSchema.default({}),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

/** Edição de agente — todos os campos opcionais; `id` obrigatório. */
export const updateAgentSchema = createAgentSchema.partial().extend({
  id: z.uuid('Identificador de agente inválido'),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

export const organizationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug muito curto')
  .max(48, 'Slug demasiado longo')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug apenas com letras minúsculas, números e hífens');

/** Criação de organização (validação de cliente; o servidor revalida). */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo de 120 caracteres'),
  slug: organizationSlugSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const callQuerySchema = z.object({
  status: callStatusSchema.optional(),
  direction: callDirectionSchema.optional(),
  agentId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CallQuery = z.infer<typeof callQuerySchema>;

/**
 * Número de telefone em formato internacional simples (`+` e dígitos,
 * espaços/parênteses/hífens permitidos). A telefonia real validará o E.164
 * no fornecedor — aqui evitam-se entradas obviamente inválidas.
 */
export const phoneNumberSchema = z
  .string()
  .trim()
  .min(5, 'Número de telefone demasiado curto')
  .max(32, 'Número de telefone demasiado longo')
  .regex(/^\+?[0-9][0-9\s()-]*$/, 'Número de telefone inválido');

/** Início de chamada (validação de cliente; o servidor revalida). */
export const startCallSchema = z.object({
  agentId: z.uuid('Agente inválido'),
  toNumber: phoneNumberSchema,
});

export type StartCallInput = z.infer<typeof startCallSchema>;

/* ── Autenticação ─────────────────────────────────────────── */

export const emailSchema = z.email('Introduz um email válido').max(254, 'Email demasiado longo');

/** Palavra-passe: mínimo alinhado com a política do Supabase Auth (8). */
export const passwordSchema = z
  .string()
  .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
  .max(72, 'Máximo de 72 caracteres');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Palavra-passe obrigatória').max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As palavras-passe não coincidem',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As palavras-passe não coincidem',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
