import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listAssets, getProject } from "@/lib/db";
import { resolveSite } from "@/lib/engine/page-engine";
import { SiteDocument, sectionLayoutCss } from "@/lib/engine/renderer";
import { buildPageSeo, buildStructuredData } from "@/lib/seo/build";
import { verifyPreviewToken } from "@/lib/preview/token";
import { themeToCss } from "@/lib/theme/tokens";
import type { AssetRefType } from "@/lib/site-schema";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; form?: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const check = verifyPreviewToken(token);
  if (!check) return {};
  const project = getProject(check.projectId);
  if (!project?.schemaJson) return {};
  const resolved = resolveSite(project.schemaJson);
  if (!resolved.ok) return {};
  const { page } = await searchParams;
  const sp = page ?? "/";
  const entry = resolved.site.pages.find((p) => p.page.path === sp) ?? resolved.site.pages[0];
  const seo = buildPageSeo(resolved.site.schema, entry.page);
  return {
    title: seo.title,
    description: seo.description,
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  };
}

export default async function PreviewSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; form?: string }>;
}) {
  const { token } = await params;
  const check = verifyPreviewToken(token);
  if (!check) notFound();
  const project = getProject(check.projectId);
  if (!project) notFound();

  const { page: pageParam, form } = await searchParams;
  const pagePath = pageParam ?? "/";

  if (!project.schemaJson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0C09] p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-white">Website ainda não gerado</p>
          <p className="mt-2 text-sm text-white/60">Corre a geração no dashboard ORBITA para o veres aqui.</p>
        </div>
      </div>
    );
  }

  const resolved = resolveSite(project.schemaJson);
  if (!resolved.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0C09] p-10 text-center text-sm text-white/70">
        Schema inválido — {resolved.issues[0]?.message}
      </div>
    );
  }

  const schema = resolved.site.schema;
  const entry = resolved.site.pages.find((p) => p.page.path === pagePath) ?? resolved.site.pages[0];

  const assets = listAssets(project.id);
  const assetIds = new Set(assets.map((a) => a.id));

  const linkFor = (path: string) => `?page=${encodeURIComponent(path)}`;
  const assetUrl = (ref: AssetRefType) =>
    ref.startsWith("asset:") ? `/api/asset/${ref.slice(6)}?pt=${token}` : ref;

  const structuredData = buildStructuredData(schema);
  const css = themeToCss(schema.theme) + "\n" + sectionLayoutCss(resolved.site.pages);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <SiteDocument
        site={resolved.site}
        ctx={{
          schema,
          linkFor,
          assetUrl,
          assetIds,
          contactPayload: {
            projectId: project.id,
            previewToken: token,
            returnTo: `/preview/${token}/site?page=${encodeURIComponent(pagePath)}`,
          },
          contactSubmitted: form === "ok",
          contactError: form === "error",
          pagePath: entry.page.path,
        }}
      />
    </>
  );
}
