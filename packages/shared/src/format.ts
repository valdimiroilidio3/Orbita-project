/**
 * Formatação determinística para UI (pt-PT por omissão).
 * Funções puras, cobertas por testes unitários.
 */

const DEFAULT_LOCALE = 'pt-PT';

export interface DateTimeFormatOptions {
  locale?: string;
  timeZone?: string;
}

/** Formata duração em segundos (ex.: 3665 → "1h 1m 5s"). `null`/`undefined` → "—". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const whole = Math.floor(totalSeconds);
  const seconds = whole % 60;
  const minutes = Math.floor(whole / 60) % 60;
  const hours = Math.floor(whole / 3600);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`);
  if (hours === 0 || seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/** Formata valor monetário (ex.: 12.34 → "12,34 €"). `null`/`undefined` → "—". */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'EUR',
  locale: string = DEFAULT_LOCALE,
): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formata data+hora (ex.: "18/10/2026, 14:30"). Aceita ISO string ou Date. */
export function formatDateTime(
  value: string | Date | null | undefined,
  options: DateTimeFormatOptions = {},
): string {
  if (value == null) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/** Formata apenas a data (ex.: "18/10/2026"). */
export function formatDate(
  value: string | Date | null | undefined,
  options: DateTimeFormatOptions = {},
): string {
  if (value == null) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/** Formata número inteiro com separadores de milhares (ex.: 12345 → "12 345" em pt-PT). */
export function formatInteger(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
