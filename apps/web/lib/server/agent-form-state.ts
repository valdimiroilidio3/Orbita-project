/**
 * Estado dos formulários do Agent Studio (fora de ficheiros 'use server',
 * que só podem exportar funções assíncronas).
 */
export interface AgentFormState {
  error: string | null;
  success: string | null;
}

export const INITIAL_AGENT_STATE: AgentFormState = { error: null, success: null };
