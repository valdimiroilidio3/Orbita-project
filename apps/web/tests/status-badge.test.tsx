// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '../components/ui/status-badge';

describe('StatusBadge', () => {
  it('mostra o rótulo PT de estado de chamada', () => {
    render(<StatusBadge status="completed" kind="call" />);
    expect(screen.getByText('Concluída')).toBeTruthy();
  });

  it('mostra o rótulo PT de estado de agente', () => {
    render(<StatusBadge status="paused" kind="agent" />);
    expect(screen.getByText('Em pausa')).toBeTruthy();
  });
});
