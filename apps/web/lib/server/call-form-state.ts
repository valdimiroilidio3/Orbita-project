/**
 * Estado dos formulários do motor de chamadas (fora de ficheiros 'use server',
 * que só podem exportar funções assíncronas).
 */
export interface CallFormState {
  error: string | null;
  success: string | null;
}

export const INITIAL_CALL_STATE: CallFormState = { error: null, success: null };
