/**
 * ORBITA ENGINE — authorization at the server boundary.
 *
 * Multi-tenancy rule: every project query for a logged-in user is scoped by
 * an explicit membership check. Frontend route protection is never the only
 * guard: each server action and data route re-checks here.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembershipForUser, getProject, type Project } from "@/lib/db";

export type SessionUser = { id: string; name?: string | null; email?: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id, name: session.user.name, email: session.user.email };
  }
  return null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin");
  return user;
}

export async function getOrgForUser(userId: string) {
  return getMembershipForUser(userId);
}

export async function requireOrg() {
  const user = await requireUser();
  const membership = getMembershipForUser(user.id);
  if (!membership) redirect("/auth/signup");
  return { user, membership, organization: membership.organization };
}

export async function requireProject(projectId: string) {
  const { user, organization } = await requireOrg();
  const project = getProject(projectId, organization.id);
  if (!project) redirect("/projects");
  return { user, organization, project };
}

export type { Project };
