"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMembershipForUser, getProject, createContactSubmission } from "@/lib/db";
import { verifyPreviewToken } from "@/lib/preview/token";
import type { ContactPayload } from "@/lib/registry/types";

const formSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(3).max(2000),
});

/**
 * Real contact form handler. Authz: a logged-in org member, or a valid
 * signed preview token for this exact project.
 */
export async function submitContact(payload: ContactPayload, formData: FormData) {
  const parsed = formSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  const sep = payload.returnTo.includes("?") ? "&" : "?";
  const fail = (): never => redirect(`${payload.returnTo}${sep}form=error`);

  let allowed = false;
  const session = await auth();
  if (session?.user?.id) {
    const membership = getMembershipForUser(session.user.id);
    if (membership) {
      const project = getProject(payload.projectId, membership.organization.id);
      allowed = Boolean(project);
    }
  }
  if (!allowed) {
    const check = verifyPreviewToken(payload.previewToken);
    allowed = check?.projectId === payload.projectId;
  }

  if (!parsed.success || !allowed) return fail();

  createContactSubmission({
    projectId: payload.projectId,
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  });
  redirect(`${payload.returnTo}${sep}form=ok`);
}
