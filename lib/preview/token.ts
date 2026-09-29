/**
 * ORBITA ENGINE — signed preview tokens.
 *
 * Preview URLs carry an HMAC-signed, expiring token (no DB round-trip,
 * old links stop working after expiry). This is what makes preview sharing
 * safe: a preview URL only grants read access to that one project's rendered
 * output and its assets.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  return process.env.PREVIEW_SECRET ?? "orbita-dev-preview-secret";
}

export function signPreviewToken(projectId: string, ttlMs = DEFAULT_TTL_MS): string {
  const expiresAt = Date.now() + ttlMs;
  const body = Buffer.from(`${projectId}.${expiresAt}`).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPreviewToken(
  token: string,
): { projectId: string; expiresAt: number } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const decoded = Buffer.from(body, "base64url").toString("utf8");
  const sep = decoded.lastIndexOf(".");
  if (sep <= 0) return null;
  const projectId = decoded.slice(0, sep);
  const expiresAt = Number(decoded.slice(sep + 1));
  if (!projectId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { projectId, expiresAt };
}
