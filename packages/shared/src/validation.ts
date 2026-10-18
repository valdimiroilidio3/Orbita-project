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

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120, 'Máximo de 120 caracteres'),
  description: z.string().trim().max(2000).nullish(),
  instructions: z.string().max(20000).default(''),
  language: z
    .string()
    .trim()
    .min(2, 'Código de idioma inválido')
    .max(16, 'Código de idioma inválido')
    .default('pt-PT'),
  status: agentStatusSchema.default('draft'),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const organizationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug muito curto')
  .max(48, 'Slug demasiado longo')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug apenas com letras minúsculas, números e hífens');

export const callQuerySchema = z.object({
  status: callStatusSchema.optional(),
  direction: callDirectionSchema.optional(),
  agentId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CallQuery = z.infer<typeof callQuerySchema>;
