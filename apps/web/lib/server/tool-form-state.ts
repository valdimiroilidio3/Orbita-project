/** Estado dos formulários de ferramentas/automações (fora de 'use server'). */
export interface ToolFormState {
  error: string | null;
  success: string | null;
}

export const INITIAL_TOOL_STATE: ToolFormState = { error: null, success: null };
