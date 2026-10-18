/**
 * Organização ativa — lógica pura (sem dependências de request).
 * A validação de autorização acontece no servidor e no RLS; esta função
 * apenas escolhe entre as organizações JÁ autorizadas do utilizador.
 */

export const ACTIVE_ORG_COOKIE = 'orbita_active_org';

/** Função pura de seleção (testada): preferência válida, senão a primeira. */
export function pickActiveOrganization<T extends { id: string }>(
  organizations: T[],
  preferredId: string | null | undefined,
): T | null {
  if (organizations.length === 0) return null;
  if (preferredId) {
    const preferred = organizations.find((organization) => organization.id === preferredId);
    if (preferred) return preferred;
  }
  return organizations[0] ?? null;
}
