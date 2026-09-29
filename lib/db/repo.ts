/**
 * ORBITA ENGINE — repository layer (the only module that talks to the DB).
 *
 * Tenant isolation is enforced here: project lookups are always scoped by
 * organization when a session context is available.
 */
import { randomUUID } from "node:crypto";
import { getDb, nowIso } from "./client";
import type {
  Asset,
  ContactSubmission,
  GenerationLogEntry,
  Membership,
  Organization,
  Project,
  User,
  Version,
} from "./types";

function parseJson(value: string | null): unknown | null {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function mapUser(row: Record<string, unknown>): User {
  return row as unknown as User;
}

export function getUserByEmail(email: string): User | null {
  const row = getDb().prepare(`SELECT * FROM "User" WHERE email = ?`).get(email.toLowerCase().trim());
  return row ? mapUser(row as Record<string, unknown>) : null;
}

export function getUserById(id: string): User | null {
  const row = getDb().prepare(`SELECT * FROM "User" WHERE id = ?`).get(id);
  return row ? mapUser(row as Record<string, unknown>) : null;
}

export function createUser(data: { id?: string; email: string; name: string; passwordHash: string }): User {
  const id = data.id ?? randomUUID();
  const now = nowIso();
  getDb()
    .prepare(`INSERT INTO "User" (id, email, name, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, data.email.toLowerCase().trim(), data.name, data.passwordHash, now, now);
  return getUserById(id)!;
}

export function updateUser(id: string, data: { name?: string }): void {
  const name = data.name !== undefined ? data.name : undefined;
  if (name !== undefined) {
    getDb()
      .prepare(`UPDATE "User" SET name = ?, updatedAt = ? WHERE id = ?`)
      .run(name, nowIso(), id);
  }
}

// ---------------------------------------------------------------------------
// Organizations & memberships
// ---------------------------------------------------------------------------

function mapOrg(row: Record<string, unknown>): Organization {
  return row as unknown as Organization;
}

export function createOrganization(data: { id?: string; name: string; slug: string }): Organization {
  const id = data.id ?? randomUUID();
  getDb()
    .prepare(`INSERT INTO "Organization" (id, name, slug, createdAt) VALUES (?, ?, ?, ?)`)
    .run(id, data.name, data.slug, nowIso());
  return { id, name: data.name, slug: data.slug, createdAt: nowIso() };
}

export function createMembership(data: {
  id?: string;
  userId: string;
  organizationId: string;
  role?: string;
}): Membership {
  const id = data.id ?? randomUUID();
  getDb()
    .prepare(`INSERT INTO "Membership" (id, role, userId, organizationId, createdAt) VALUES (?, ?, ?, ?, ?)`)
    .run(id, data.role ?? "owner", data.userId, data.organizationId, nowIso());
  return { id, role: data.role ?? "owner", userId: data.userId, organizationId: data.organizationId, createdAt: nowIso() };
}

export function getMembershipForUser(
  userId: string,
): { membership: Membership; organization: Organization } | null {
  const row = getDb()
    .prepare(
      `SELECT m.*, o.id AS orgId, o.name AS orgName, o.slug AS orgSlug, o.createdAt AS orgCreatedAt
       FROM "Membership" m JOIN "Organization" o ON o.id = m.organizationId
       WHERE m.userId = ? LIMIT 1`,
    )
    .get(userId);
  if (!row) return null;
  const r = row as Record<string, unknown>;
  return {
    membership: {
      id: String(r.id),
      role: String(r.role),
      userId: String(r.userId),
      organizationId: String(r.organizationId),
      createdAt: String(r.createdAt),
    },
    organization: {
      id: String(r.orgId),
      name: String(r.orgName),
      slug: String(r.orgSlug),
      createdAt: String(r.orgCreatedAt),
    },
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description == null ? null : String(row.description),
    status: String(row.status) as Project["status"],
    schemaJson: parseJson(row.schemaJson as string | null),
    briefJson: parseJson(row.briefJson as string | null),
    generationLog: (parseJson(row.generationLog as string | null) as GenerationLogEntry[] | null) ?? null,
    previewToken: String(row.previewToken),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    deletedAt: row.deletedAt == null ? null : String(row.deletedAt),
  };
}

export function createProject(data: {
  id?: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  status?: string;
  previewToken: string;
}): Project {
  const id = data.id ?? randomUUID();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO "Project" (id, organizationId, name, slug, description, status, previewToken, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      data.organizationId,
      data.name,
      data.slug,
      data.description ?? null,
      data.status ?? "draft",
      data.previewToken,
      now,
      now,
    );
  return getProject(id)!;
}

export function getProject(projectId: string, organizationId?: string): Project | null {
  const db = getDb();
  const row = organizationId
    ? db
        .prepare(
          `SELECT * FROM "Project" WHERE id = ? AND organizationId = ? AND deletedAt IS NULL`,
        )
        .get(projectId, organizationId)
    : db.prepare(`SELECT * FROM "Project" WHERE id = ? AND deletedAt IS NULL`).get(projectId);
  return row ? mapProject(row as Record<string, unknown>) : null;
}

export function projectSlugExists(organizationId: string, slug: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 FROM "Project" WHERE organizationId = ? AND slug = ?`)
    .get(organizationId, slug);
  return Boolean(row);
}

export function listProjects(organizationId: string): Project[] {
  const rows = getDb()
    .prepare(`SELECT * FROM "Project" WHERE organizationId = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`)
    .all(organizationId) as Record<string, unknown>[];
  return rows.map(mapProject);
}

export function countProjectsByStatus(organizationId: string): Record<string, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) AS n FROM "Project" WHERE organizationId = ? AND deletedAt IS NULL GROUP BY status`)
    .all(organizationId) as { status: string; n: number }[];
  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = row.n;
  return out;
}

export function updateProject(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    status: string;
    schemaJson: unknown | null;
    briefJson: unknown | null;
    generationLog: unknown | null;
    previewToken: string;
  }>,
): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const set = (col: string, value: unknown) => {
    fields.push(`${col} = ?`);
    values.push(value == null ? null : typeof value === "string" ? value : JSON.stringify(value));
  };
  if (data.name !== undefined) set("name", data.name);
  if (data.description !== undefined) set("description", data.description);
  if (data.status !== undefined) set("status", data.status);
  if (data.schemaJson !== undefined) set("schemaJson", data.schemaJson);
  if (data.briefJson !== undefined) set("briefJson", data.briefJson);
  if (data.generationLog !== undefined) set("generationLog", data.generationLog);
  if (data.previewToken !== undefined) set("previewToken", data.previewToken);
  if (fields.length === 0) return;
  fields.push(`updatedAt = ?`);
  values.push(nowIso(), id);
  getDb().prepare(`UPDATE "Project" SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

function mapAsset(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    kind: String(row.kind),
    url: String(row.url),
    filename: String(row.filename),
    mimeType: String(row.mimeType),
    sizeBytes: Number(row.sizeBytes),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    alt: row.alt == null ? null : String(row.alt),
    metadata: parseJson(row.metadata as string | null),
    createdAt: String(row.createdAt),
  };
}

export function createAsset(data: {
  id: string;
  projectId: string;
  kind: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  metadata?: unknown;
}): Asset {
  getDb()
    .prepare(
      `INSERT INTO "Asset" (id, projectId, kind, url, filename, mimeType, sizeBytes, width, height, alt, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.id,
      data.projectId,
      data.kind,
      data.url,
      data.filename,
      data.mimeType,
      data.sizeBytes,
      data.width ?? null,
      data.height ?? null,
      data.alt ?? null,
      data.metadata != null ? JSON.stringify(data.metadata) : null,
      nowIso(),
    );
  return getAsset(data.id)!;
}

export function getAsset(id: string): (Asset & { project: Project }) | null {
  const row = getDb()
    .prepare(
      `SELECT a.*,
              p.id AS p_id, p.organizationId AS p_organizationId, p.name AS p_name,
              p.slug AS p_slug, p.description AS p_description, p.status AS p_status,
              p.schemaJson AS p_schemaJson, p.briefJson AS p_briefJson,
              p.generationLog AS p_generationLog, p.previewToken AS p_previewToken,
              p.createdAt AS p_createdAt, p.updatedAt AS p_updatedAt, p.deletedAt AS p_deletedAt
       FROM "Asset" a JOIN "Project" p ON p.id = a.projectId WHERE a.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const project: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("p_")) project[key.slice(2)] = value;
  }
  const assetRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith("p_")) assetRow[key] = value;
  }
  return { ...mapAsset(assetRow), project: mapProject(project) };
}

export function listAssets(projectId: string): Asset[] {
  const rows = getDb()
    .prepare(`SELECT * FROM "Asset" WHERE projectId = ? ORDER BY createdAt ASC`)
    .all(projectId) as Record<string, unknown>[];
  return rows.map(mapAsset);
}

export function listOrgAssets(organizationId: string): (Asset & { projectName: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT a.*, p.name AS projectName FROM "Asset" a
       JOIN "Project" p ON p.id = a.projectId
       WHERE p.organizationId = ? AND p.deletedAt IS NULL ORDER BY a.createdAt DESC`,
    )
    .all(organizationId) as Record<string, unknown>[];
  return rows.map((row) => {
    const { projectName, ...rest } = row;
    return { ...mapAsset(rest), projectName: String(projectName) };
  });
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

function mapVersion(row: Record<string, unknown>): Version {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    number: Number(row.number),
    schemaJson: parseJson(String(row.schemaJson)),
    message: String(row.message),
    createdBy: row.createdBy == null ? null : String(row.createdBy),
    createdAt: String(row.createdAt),
  };
}

export function createVersion(data: {
  projectId: string;
  number: number;
  schemaJson: unknown;
  message: string;
  createdBy?: string | null;
}): Version {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO "Version" (id, projectId, number, schemaJson, message, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, data.projectId, data.number, JSON.stringify(data.schemaJson), data.message, data.createdBy ?? null, nowIso());
  return {
    id,
    projectId: data.projectId,
    number: data.number,
    schemaJson: data.schemaJson,
    message: data.message,
    createdBy: data.createdBy ?? null,
    createdAt: nowIso(),
  };
}

export function listVersions(projectId: string): Version[] {
  const rows = getDb()
    .prepare(`SELECT * FROM "Version" WHERE projectId = ? ORDER BY number DESC`)
    .all(projectId) as Record<string, unknown>[];
  return rows.map(mapVersion);
}

export function getVersion(versionId: string, projectId: string): Version | null {
  const row = getDb()
    .prepare(`SELECT * FROM "Version" WHERE id = ? AND projectId = ?`)
    .get(versionId, projectId) as Record<string, unknown> | undefined;
  return row ? mapVersion(row) : null;
}

export function maxVersionNumber(projectId: string): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(MAX(number), 0) AS n FROM "Version" WHERE projectId = ?`)
    .get(projectId) as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------------
// Contact submissions
// ---------------------------------------------------------------------------

export function createContactSubmission(data: {
  projectId: string;
  name: string;
  email: string;
  message: string;
  pagePath?: string | null;
}): ContactSubmission {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO "ContactSubmission" (id, projectId, name, email, message, pagePath, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, data.projectId, data.name, data.email, data.message, data.pagePath ?? null, nowIso());
  return { id, projectId: data.projectId, name: data.name, email: data.email, message: data.message, pagePath: data.pagePath ?? null, createdAt: nowIso() };
}
