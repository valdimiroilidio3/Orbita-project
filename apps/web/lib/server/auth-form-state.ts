/**
 * Estado dos formulários de autenticação/organização.
 * (Fora de um ficheiro 'use server', que só pode exportar funções async.)
 */
export interface AuthFormState {
  error: string | null;
  success: string | null;
}

export const INITIAL_AUTH_STATE: AuthFormState = { error: null, success: null };
