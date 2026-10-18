import { describe, expect, it } from 'vitest';

import {
  canTransitionCallStatus,
  isTerminalCallStatus,
  phoneNumberSchema,
  startCallSchema,
} from '@orbita/shared';

import {
  CALL_PROVIDER_SIMULADO,
  INITIAL_CALL_STATUS,
  SIMULATED_CALL_PROGRESS,
  canCancelCall,
  canFinishCall,
  computeCallDurationSeconds,
  estimateSimulatedCost,
  isSimulatedProvider,
} from '@/lib/calls';

describe('canTransitionCallStatus', () => {
  it('percorre o caminho feliz completo', () => {
    expect(canTransitionCallStatus('queued', 'initiating')).toBe(true);
    expect(canTransitionCallStatus('initiating', 'ringing')).toBe(true);
    expect(canTransitionCallStatus('ringing', 'in_progress')).toBe(true);
    expect(canTransitionCallStatus('in_progress', 'completed')).toBe(true);
  });

  it('permite resultados alternativos do toque', () => {
    expect(canTransitionCallStatus('ringing', 'no_answer')).toBe(true);
    expect(canTransitionCallStatus('ringing', 'busy')).toBe(true);
    expect(canTransitionCallStatus('initiating', 'failed')).toBe(true);
    expect(canTransitionCallStatus('in_progress', 'transferred')).toBe(true);
  });

  it('permite cancelar de qualquer estado não terminal', () => {
    for (const from of ['queued', 'initiating', 'ringing', 'in_progress'] as const) {
      expect(canTransitionCallStatus(from, 'cancelled')).toBe(true);
    }
  });

  it('estados terminais não transitam', () => {
    const terminal = [
      'completed',
      'failed',
      'busy',
      'no_answer',
      'cancelled',
      'transferred',
    ] as const;
    for (const from of terminal) {
      expect(isTerminalCallStatus(from)).toBe(true);
      for (const to of ['queued', 'initiating', 'in_progress', 'completed'] as const) {
        expect(canTransitionCallStatus(from, to)).toBe(false);
      }
    }
  });

  it('não regressa à fila nem salta etapas do caminho feliz', () => {
    expect(canTransitionCallStatus('in_progress', 'queued')).toBe(false);
    expect(canTransitionCallStatus('ringing', 'queued')).toBe(false);
    expect(canTransitionCallStatus('queued', 'in_progress')).toBe(false);
    expect(canTransitionCallStatus('queued', 'completed')).toBe(false);
    expect(canTransitionCallStatus('queued', 'queued')).toBe(false);
  });
});

describe('SIMULATED_CALL_PROGRESS', () => {
  it('é uma sequência de transições válidas a partir de queued', () => {
    let status = INITIAL_CALL_STATUS;
    for (const next of SIMULATED_CALL_PROGRESS) {
      expect(canTransitionCallStatus(status, next)).toBe(true);
      status = next;
    }
    expect(status).toBe('in_progress');
    expect(canTransitionCallStatus(status, 'completed')).toBe(true);
  });
});

describe('phoneNumberSchema', () => {
  it('aceita números internacionais comuns', () => {
    expect(phoneNumberSchema.parse('+351 210 000 000')).toBe('+351 210 000 000');
    expect(phoneNumberSchema.parse('+1 (415) 555-0100')).toBe('+1 (415) 555-0100');
    expect(phoneNumberSchema.parse('210000000')).toBe('210000000');
  });

  it('rejeita entradas inválidas', () => {
    expect(phoneNumberSchema.safeParse('').success).toBe(false);
    expect(phoneNumberSchema.safeParse('abc').success).toBe(false);
    expect(phoneNumberSchema.safeParse('+351; DROP TABLE').success).toBe(false);
    expect(phoneNumberSchema.safeParse('123').success).toBe(false);
    expect(phoneNumberSchema.safeParse(`+${'9'.repeat(40)}`).success).toBe(false);
  });
});

describe('startCallSchema', () => {
  it('exige agente uuid e número válido', () => {
    const parsed = startCallSchema.parse({
      agentId: '00000000-0000-4000-8000-000000000001',
      toNumber: '+351 210 000 000',
    });
    expect(parsed.agentId).toBe('00000000-0000-4000-8000-000000000001');
    expect(startCallSchema.safeParse({ agentId: 'x', toNumber: '+351' }).success).toBe(false);
  });
});

describe('estimateSimulatedCost', () => {
  it('cobra 0,02 €/minuto proporcional', () => {
    expect(estimateSimulatedCost(60)).toBe(0.02);
    expect(estimateSimulatedCost(30)).toBe(0.01);
    expect(estimateSimulatedCost(0)).toBe(0);
    expect(estimateSimulatedCost(-10)).toBe(0);
    expect(estimateSimulatedCost(3600)).toBeCloseTo(1.2, 5);
  });
});

describe('computeCallDurationSeconds', () => {
  it('calcula a coerência entre timestamps', () => {
    expect(computeCallDurationSeconds('2026-10-18T10:00:00.000Z', '2026-10-18T10:01:30.000Z')).toBe(
      90,
    );
  });

  it('nunca devolve negativo nem NaN', () => {
    expect(computeCallDurationSeconds('2026-10-18T10:01:30.000Z', '2026-10-18T10:00:00.000Z')).toBe(
      0,
    );
    expect(computeCallDurationSeconds('data inválida', '2026-10-18T10:00:00.000Z')).toBe(0);
  });
});

describe('controles de chamada', () => {
  it('terminar apenas chamadas em curso', () => {
    expect(canFinishCall('in_progress')).toBe(true);
    expect(canFinishCall('ringing')).toBe(false);
    expect(canFinishCall('completed')).toBe(false);
  });

  it('cancelar enquanto não terminal', () => {
    expect(canCancelCall('queued')).toBe(true);
    expect(canCancelCall('in_progress')).toBe(true);
    expect(canCancelCall('completed')).toBe(false);
  });
});

describe('isSimulatedProvider', () => {
  it('identifica o simulador local', () => {
    expect(isSimulatedProvider(CALL_PROVIDER_SIMULADO)).toBe(true);
    expect(isSimulatedProvider('twilio')).toBe(false);
    expect(isSimulatedProvider(null)).toBe(false);
  });
});
