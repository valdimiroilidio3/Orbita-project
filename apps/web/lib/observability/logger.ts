/**
 * Logger estruturado mínimo (servidor).
 *
 * • Uma linha JSON por evento → compatível com agregadores (Vercel, Datadog, etc.).
 * • `correlationId` propaga-se por pedido (webhooks, execuções de ferramentas).
 * • Lista negra de chaves sensíveis — nunca segredos, números completos,
 *   argumentos de ferramentas nem conteúdo de conversas.
 */

export type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'secret',
  'token',
  'password',
  'apikey',
  'api_key',
  'service_role',
  'rawbody',
  'args',
  'result',
  'transcript',
  'phone',
  'from_number',
  'to_number',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[truncado]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, 300) };
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redigido]' : sanitize(item, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(sanitize(fields) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
