"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import {
  createAsset,
  createMembership,
  createOrganization,
  createProject,
  createUser,
  createVersion,
  getMembershipForUser,
  getProject,
  getUserByEmail,
  listAssets,
  listVersions,
  maxVersionNumber,
  projectSlugExists,
  tx,
  updateProject,
  updateUser,
  getVersion,
} from "@/lib/db";
import { detectDimensions } from "@/lib/assets/dimensions";
import { BriefSchema } from "@/lib/engine/brief";
import { generateWebsite } from "@/lib/engine/generator";
import {
  deleteSection,
  duplicateSection,
  moveSection,
  reorderSections,
  setSectionHidden,
  updateSectionProps,
  type MutResult,
} from "@/lib/engine/mutations";
import { signPreviewToken } from "@/lib/preview/token";
import { getComponent } from "@/lib/registry";
import type { SiteSchemaType } from "@/lib/site-schema";
import { migrateSiteSchema } from "@/lib/site-schema/migrations";
import { hashPassword } from "./password";
import { requireOrg, requireProject } from "./authz";

export type ActionResult =
  | {
      ok: true;
      projectId?: string;
      token?: string;
      savedAt?: number;
      asset?: { id: string; url: string; filename: string; width: number | null; height: number | null };
    }
  | { ok: false; error: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";
}

async function loadSchema(projectId: string): Promise<SiteSchemaType | null> {
  const project = getProject(projectId);
  if (!project?.schemaJson) return null;
  const migrated = migrateSiteSchema(project.schemaJson);
  return migrated.ok ? migrated.schema : null;
}

function saveSchema(projectId: string, schema: SiteSchemaType) {
  updateProject(projectId, { schemaJson: schema });
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/assets");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
    await signIn("credentials", formData);
  } catch {
    return { ok: false, error: "Não foi possível iniciar sessão." };
  }
  return { ok: true };
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().min(2).max(80),
      email: z.string().email().max(200),
      password: z.string().min(8).max(200),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const email = parsed.data.email.toLowerCase().trim();
  if (getUserByEmail(email)) return { ok: false, error: "Este email já está registado." };

  const baseSlug = slugify(parsed.data.name);
  const orgSlug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
  const passwordHash = await hashPassword(parsed.data.password);

  tx((db) => {
    const user = createUser({ email, name: parsed.data.name.trim(), passwordHash });
    const org = createOrganization({ name: `${parsed.data.name.trim()} — Studio`, slug: orgSlug });
    createMembership({ userId: user.id, organizationId: org.id, role: "owner" });
  });

  await signIn("credentials", formData);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/auth/signin" });
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const { user } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Nome inválido." };
  updateUser(user.id, { name });
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProjectAction(formData: FormData): Promise<ActionResult> {
  const { organization } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "O nome do projeto deve ter entre 2 e 80 caracteres." };
  }
  const description = String(formData.get("description") ?? "").trim() || null;

  let slug = slugify(name);
  for (let i = 2; projectSlugExists(organization.id, slug) && i <= 50; i++) {
    slug = `${slugify(name)}-${i}`;
  }
  if (projectSlugExists(organization.id, slug)) {
    return { ok: false, error: "Não foi possível criar um slug único." };
  }

  const id = randomUUID();
  createProject({
    id,
    organizationId: organization.id,
    name,
    slug,
    description,
    status: "draft",
    previewToken: signPreviewToken(id),
  });
  revalidateProject(id);
  return { ok: true, projectId: id };
}

export async function archiveProjectAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  await requireProject(projectId);
  const archive = formData.get("archive") === "1";
  updateProject(projectId, { status: archive ? "archived" : "draft" });
  revalidateProject(projectId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const ASSET_RULES: { mime: string; ext: string; maxBytes: number; kind: string }[] = [
  { mime: "image/jpeg", ext: "jpg", maxBytes: 4 * 1024 * 1024, kind: "image" },
  { mime: "image/png", ext: "png", maxBytes: 4 * 1024 * 1024, kind: "image" },
  { mime: "image/webp", ext: "webp", maxBytes: 4 * 1024 * 1024, kind: "image" },
  { mime: "image/avif", ext: "avif", maxBytes: 4 * 1024 * 1024, kind: "image" },
  { mime: "image/svg+xml", ext: "svg", maxBytes: 512 * 1024, kind: "svg" },
  { mime: "video/mp4", ext: "mp4", maxBytes: 40 * 1024 * 1024, kind: "video" },
  { mime: "video/webm", ext: "webm", maxBytes: 40 * 1024 * 1024, kind: "video" },
];

export async function uploadAssetAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  await requireProject(projectId);
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Ficheiro em falta." };

  const rule = ASSET_RULES.find((r) => r.mime === file.type);
  if (!rule) return { ok: false, error: "Tipo de ficheiro não suportado." };
  if (file.size > rule.maxBytes) {
    return { ok: false, error: `Ficheiro demasiado grande (máx. ${Math.round(rule.maxBytes / 1024 / 1024)} MB).` };
  }

  const id = `a_${randomBytes(9).toString("hex")}`;
  const filename = `${id}.${rule.ext}`;
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const dimensions = rule.mime.startsWith("image/") ? detectDimensions(buffer, rule.mime) : null;
  const kind = formData.get("kind") === "logo" ? "logo" : rule.kind;

  const created = createAsset({
    id,
    projectId,
    kind,
    url: `/api/asset/${id}`,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    alt: file.name.replace(/\.[^.]+$/, ""),
    metadata: { storagePath: path.join("uploads", filename) },
  });
  revalidateProject(projectId);
  return {
    ok: true,
    projectId,
    asset: {
      id: created.id,
      url: created.url,
      filename: created.filename,
      width: created.width,
      height: created.height,
    },
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateProjectAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const { user } = await requireProject(projectId);

  let briefJson: unknown;
  try {
    briefJson = JSON.parse(String(formData.get("brief") ?? "{}"));
  } catch {
    return { ok: false, error: "Briefing inválido (JSON)." };
  }
  const parsedBrief = BriefSchema.safeParse(briefJson);
  if (!parsedBrief.success) {
    return { ok: false, error: parsedBrief.error.issues[0]?.message ?? "Briefing inválido." };
  }

  updateProject(projectId, { status: "generating" });
  const assets = listAssets(projectId).map((a) => a.id);

  try {
    const { schema, log } = await generateWebsite(parsedBrief.data, { assetIds: assets });
    tx(() => {
      updateProject(projectId, {
        schemaJson: schema,
        briefJson: parsedBrief.data,
        generationLog: log,
        status: "ready",
      });
      createVersion({
        projectId,
        number: maxVersionNumber(projectId) + 1,
        schemaJson: schema,
        message: "Geração inicial",
        createdBy: user.id,
      });
    });
    revalidateProject(projectId);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na geração.";
    updateProject(projectId, { status: "draft", generationLog: null });
    revalidateProject(projectId);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Section mutations (minimal-node, always validated)
// ---------------------------------------------------------------------------

async function applyMutation(
  projectId: string,
  pageId: string,
  sectionId: string,
  fn: (schema: SiteSchemaType, pageId: string, sectionId: string) => MutResult,
): Promise<ActionResult> {
  await requireProject(projectId);
  const schema = await loadSchema(projectId);
  if (!schema) return { ok: false, error: "Este projeto ainda não tem um website gerado." };
  const result = fn(schema, pageId, sectionId);
  if (!result.ok) return { ok: false, error: result.error };
  saveSchema(projectId, result.schema);
  revalidateProject(projectId);
  return { ok: true, savedAt: Date.now() };
}

export async function saveSectionPropsAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const rawProps = String(formData.get("props") ?? "{}");

  await requireProject(projectId);
  const schema = await loadSchema(projectId);
  if (!schema) return { ok: false, error: "Este projeto ainda não tem um website gerado." };

  const page = schema.pages.find((p) => p.id === pageId);
  const section = page?.sections.find((s) => s.id === sectionId);
  if (!page || !section) return { ok: false, error: "Secção não encontrada." };

  const def = getComponent(section.type);
  const vdef = def?.variants[section.variant];
  if (!def || !vdef) return { ok: false, error: "Componente desconhecido." };

  let incoming: Record<string, unknown>;
  try {
    incoming = JSON.parse(rawProps);
  } catch {
    return { ok: false, error: "Conteúdo inválido (JSON)." };
  }
  const merged = { ...vdef.defaultProps, ...section.props, ...incoming };
  const parsed = vdef.schema.safeParse(merged);
  if (!parsed.success) {
    return { ok: false, error: `Conteúdo inválido: ${parsed.error.issues[0]?.message ?? ""}` };
  }

  const result = updateSectionProps(schema, pageId, sectionId, parsed.data as Record<string, unknown>);
  if (!result.ok) return { ok: false, error: result.error };
  saveSchema(projectId, result.schema);
  revalidateProject(projectId);
  return { ok: true, savedAt: Date.now() };
}

export async function moveSectionAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const to = formData.get("to") === "down" ? "down" : "up";
  return applyMutation(projectId, pageId, sectionId, (s, p, id) => moveSection(s, p, id, to));
}

export async function duplicateSectionAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  return applyMutation(projectId, pageId, sectionId, (s, p, id) => duplicateSection(s, p, id));
}

export async function deleteSectionAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  return applyMutation(projectId, pageId, sectionId, (s, p, id) => deleteSection(s, p, id));
}

export async function setSectionHiddenAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const breakpoint = String(formData.get("breakpoint") ?? "mobile") as "mobile" | "tablet" | "desktop";
  const hidden = formData.get("hidden") === "1";
  return applyMutation(projectId, pageId, sectionId, (s, p, id) =>
    setSectionHidden(s, p, id, breakpoint, hidden),
  );
}

export async function reorderSectionsAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  let orderedIds: string[];
  try {
    orderedIds = JSON.parse(String(formData.get("order") ?? "[]"));
  } catch {
    return { ok: false, error: "Ordem inválida." };
  }
  await requireProject(projectId);
  const schema = await loadSchema(projectId);
  if (!schema) return { ok: false, error: "Este projeto ainda não tem um website gerado." };
  const result = reorderSections(schema, pageId, orderedIds);
  if (!result.ok) return { ok: false, error: result.error };
  saveSchema(projectId, result.schema);
  revalidateProject(projectId);
  return { ok: true, savedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export async function createVersionAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const { user } = await requireProject(projectId);
  const message = String(formData.get("message") ?? "").trim() || "Alterações";
  const schema = await loadSchema(projectId);
  if (!schema) return { ok: false, error: "Este projeto ainda não tem um website gerado." };
  createVersion({
    projectId,
    number: maxVersionNumber(projectId) + 1,
    schemaJson: schema,
    message,
    createdBy: user.id,
  });
  revalidateProject(projectId);
  return { ok: true };
}

export async function restoreVersionAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const { user } = await requireProject(projectId);
  const version = getVersion(versionId, projectId);
  if (!version) return { ok: false, error: "Versão não encontrada." };
  const migrated = migrateSiteSchema(version.schemaJson);
  if (!migrated.ok) return { ok: false, error: "A versão não pôde ser lida." };
  tx(() => {
    updateProject(projectId, { schemaJson: migrated.schema, status: "ready" });
    createVersion({
      projectId,
      number: maxVersionNumber(projectId) + 1,
      schemaJson: migrated.schema,
      message: `Restaurado de v${version.number}`,
      createdBy: user.id,
    });
  });
  revalidateProject(projectId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export async function regeneratePreviewTokenAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  await requireProject(projectId);
  const token = signPreviewToken(projectId);
  updateProject(projectId, { previewToken: token });
  revalidateProject(projectId);
  return { ok: true, token };
}
