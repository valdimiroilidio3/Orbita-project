/** ORBITA ENGINE — DB row types (mirror of prisma/schema.prisma models). */

export type ProjectStatus =
  | "draft"
  | "generating"
  | "editing"
  | "ready"
  | "deploying"
  | "published"
  | "archived";

export type GenerationLogEntry = {
  step: string;
  status: "done" | "failed";
  durationMs: number;
  detail?: string;
};

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  role: "owner" | "admin" | "editor" | "viewer" | string;
  userId: string;
  organizationId: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  schemaJson: unknown | null;
  briefJson: unknown | null;
  generationLog: GenerationLogEntry[] | null;
  previewToken: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Asset {
  id: string;
  projectId: string;
  kind: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export interface Version {
  id: string;
  projectId: string;
  number: number;
  schemaJson: unknown;
  message: string;
  createdBy: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  provider: string;
  providerProjectId: string | null;
  url: string | null;
  status: string;
  commitHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSubmission {
  id: string;
  projectId: string;
  name: string;
  email: string;
  message: string;
  pagePath: string | null;
  createdAt: string;
}
