/** Estado dos formulários de definições (fora de 'use server'). */
export interface SettingsFormState {
  error: string | null;
  success: string | null;
  fieldErrors?: Record<string, string>;
}

export const INITIAL_SETTINGS_STATE: SettingsFormState = { error: null, success: null };
