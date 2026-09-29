/**
 * ORBITA ENGINE — database client (sandbox runtime).
 *
 * ADR-003: the production target is PostgreSQL (canonical DDL in
 * `prisma/schema.prisma`, Prisma/Drizzle). This sandbox cannot reach
 * binaries.prisma.sh, so the runtime persistence layer uses Node 22's
 * built-in `node:sqlite` with an identical relational schema. The entire
 * data access surface is isolated in `lib/db/repo.ts` — swapping the engine
 * later means re-implementing that one module; no other code touches the DB.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as { orbitaDb?: DatabaseSync };

const DDL = `
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Organization" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Membership" (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'owner',
  userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  organizationId TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL,
  UNIQUE (userId, organizationId)
);
CREATE INDEX IF NOT EXISTS idx_membership_org ON "Membership"(organizationId);

CREATE TABLE IF NOT EXISTS "Project" (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  schemaJson TEXT,
  briefJson TEXT,
  generationLog TEXT,
  previewToken TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  UNIQUE (organizationId, slug)
);
CREATE INDEX IF NOT EXISTS idx_project_org ON "Project"(organizationId);

CREATE TABLE IF NOT EXISTS "Asset" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  metadata TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_project ON "Asset"(projectId);

CREATE TABLE IF NOT EXISTS "Version" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  schemaJson TEXT NOT NULL,
  message TEXT NOT NULL,
  createdBy TEXT,
  createdAt TEXT NOT NULL,
  UNIQUE (projectId, number)
);
CREATE INDEX IF NOT EXISTS idx_version_project ON "Version"(projectId);

CREATE TABLE IF NOT EXISTS "Deployment" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'vercel',
  providerProjectId TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  commitHash TEXT,
  error TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deployment_project ON "Deployment"(projectId);

CREATE TABLE IF NOT EXISTS "AIConversation" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  title TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversation_project ON "AIConversation"(projectId);

CREATE TABLE IF NOT EXISTS "AIMessage" (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES "AIConversation"(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_conversation ON "AIMessage"(conversationId);

CREATE TABLE IF NOT EXISTS "AIAction" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  reason TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_action_project ON "AIAction"(projectId);

CREATE TABLE IF NOT EXISTS "ContactSubmission" (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  pagePath TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submission_project ON "ContactSubmission"(projectId);
`;

function dbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = raw.replace(/^file:/, "");
  return path.isAbsolute(file) ? file : path.join(process.cwd(), "prisma", file);
}

export function getDb(): DatabaseSync {
  if (!globalForDb.orbitaDb) {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(DDL);
    globalForDb.orbitaDb = db;
  }
  return globalForDb.orbitaDb;
}

/** Simple transaction wrapper. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
