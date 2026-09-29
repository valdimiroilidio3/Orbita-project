import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAsset, getMembershipForUser } from "@/lib/db";
import { verifyPreviewToken } from "@/lib/preview/token";

/**
 * Asset delivery with authorization.
 * Access is granted only to:
 *  - a logged-in member of the owning organization, or
 *  - a valid signed preview token for the owning project (?pt=...).
 * Sample assets (public/) redirect to the public static file after the same
 * checks — the asset row, not the file path, is the authorization unit.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = getAsset(id);
  if (!asset) return new Response("Not found", { status: 404 });

  let allowed = false;
  const session = await auth();
  if (session?.user?.id) {
    const membership = getMembershipForUser(session.user.id);
    if (membership && membership.organization.id === asset.project.organizationId) allowed = true;
  }
  if (!allowed) {
    const pt = req.nextUrl.searchParams.get("pt");
    if (pt && verifyPreviewToken(pt)?.projectId === asset.projectId) allowed = true;
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const storage = (asset.metadata as { storagePath?: string } | null)?.storagePath;
  if (storage) {
    if (storage.startsWith("public/")) {
      return NextResponse.redirect(new URL(`/${storage.slice("public/".length)}`, req.url), 302);
    }
    try {
      const buf = readFileSync(path.join(process.cwd(), storage));
      return new Response(new Uint8Array(buf), {
        headers: {
          "content-type": asset.mimeType,
          "cache-control": "private, max-age=3600",
        },
      });
    } catch {
      return new Response("Missing file", { status: 410 });
    }
  }
  return NextResponse.redirect(new URL(asset.url, req.url), 302);
}
