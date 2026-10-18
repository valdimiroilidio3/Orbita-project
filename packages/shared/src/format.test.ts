import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDuration,
  formatInteger,
} from './format';

describe('formatDuration', () => {
  it('formata segundos, minutos e horas', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(65)).toBe('1m 5s');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
    expect(formatDuration(3600)).toBe('1h 0m');
  });

  it('devolve "—" para valores ausentes ou inválidos', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('formata valores em EUR (pt-PT)', () => {
    expect(formatCurrency(12.34)).toContain('12,34');
    expect(formatCurrency(12.34)).toContain('€');
    expect(formatCurrency(0)).toContain('0,00');
  });

  it('devolve "—" para valores ausentes', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatDateTime / formatDate', () => {
  const iso = '2026-10-18T12:30:00.000Z';

  it('formata data e hora com timezone fixo (determinístico)', () => {
    const result = formatDateTime(iso, { timeZone: 'UTC' });
    expect(result).toContain('2026');
    expect(result).toContain('30');
  });

  it('formata apenas a data', () => {
    expect(formatDate(iso, { timeZone: 'UTC' })).toBe('18/10/2026');
  });

  it('devolve "—" para datas inválidas ou ausentes', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDateTime('não-é-data')).toBe('—');
  });
});

describe('formatInteger', () => {
  it('formata inteiros', () => {
    // pt-PT usa espaço não separador como separador de milhares — comparar só os dígitos.
    expect(formatInteger(12345).replace(/\D/g, '')).toBe('12345');
    expect(formatInteger(0)).toBe('0');
  });

  it('devolve "—" para valores ausentes', () => {
    expect(formatInteger(null)).toBe('—');
  });
});
