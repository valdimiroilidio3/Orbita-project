import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveProjectAction,
  createVersionAction,
  generateProjectAction,
  regeneratePreviewTokenAction,
  restoreVersionAction,
} from "@/lib/server/actions";

/** Casts only satisfy React 19's void form-action typing; the runtime
 *  references are the original server actions (clients await those too
 *  when they need the result). */
const generateProjectForm = generateProjectAction as unknown as (fd: FormData) => void;
const restoreVersionForm = restoreVersionAction as unknown as (fd: FormData) => void;
const createVersionForm = createVersionAction as unknown as (fd: FormData) => void;
const regeneratePreviewTokenForm = regeneratePreviewTokenAction as unknown as (fd: FormData) => void;
const archiveProjectForm = archiveProjectAction as unknown as (fd: FormData) => void;
import { requireProject } from "@/lib/server/authz";
import { listAssets, listVersions, updateProject } from "@/lib/db";
import { diffSchemas } from "@/lib/engine/mutations";
import { resolveSite } from "@/lib/engine/page-engine";
import { describeVariantSchema } from "@/lib/editor/fields";
import { runQualityChecks } from "@/lib/quality/report";
import { getComponent } from "@/lib/registry";
import { migrateSiteSchema } from "@/lib/site-schema/migrations";
import { componentLabel } from "@/lib/site-schema/catalog";
import type { SiteSchemaType } from "@/lib/site-schema";
import HubEditor, { type HubPage } from "../../components/hub-editor";
import { StatusChip, relativeTime } from "../../components/status-chip";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProject(projectId);

  const assets = listAssets(project.id);
  const versions = listVersions(project.id);
  const assetIds = new Set(assets.map((a) => a.id));
  const resolved = project.schemaJson ? resolveSite(project.schemaJson, { assetIds }) : null;
  const quality = resolved?.ok ? runQualityChecks(resolved.site.schema, assetIds) : null;

  const hubPages: HubPage[] = resolved?.ok
    ? resolved.site.pages.map((rp) => ({
        id: rp.page.id,
        path: rp.page.path,
        title: rp.page.title,
        sections: rp.sections.map((rs) => {
          const def = getComponent(rs.type);
          const vdef = def?.variants[rs.variant];
          return {
            id: rs.id,
            type: rs.type,
            typeLabel: componentLabel(rs.type),
            variant: rs.variant,
            variantLabel: vdef?.label ?? rs.variant,
            hidden: rs.hidden,
            props: rs.props,
            fields: vdef ? describeVariantSchema(vdef.schema) : [],
          };
        }),
      }))
    : [];

  const versionRows = versions.map((v, i) => {
    let diff: ReturnType<typeof diffSchemas> | null = null;
    if (i + 1 < versions.length) {
      const current = migrateSiteSchema(v.schemaJson);
      const previous = migrateSiteSchema(versions[i + 1].schemaJson);
      if (current.ok && previous.ok) diff = diffSchemas(previous.schema, current.schema);
    }
    return { version: v, diff };
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-sans text-3xl font-semibold tracking-tight">{project.name}</h1>
            <StatusChip status={project.status} />
          </div>
          {project.description && <p className="mt-1.5 max-w-xl text-sm text-ink-dim">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/preview/${project.previewToken}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-line px-4 py-2 font-sans text-xs font-semibold text-ink-dim hover:text-ink"
          >
            Abrir preview ↗
          </a>
          <button
            type="button"
            disabled
            title="Publish está na Phase 07 (deploy GitHub/Vercel). Não é simulado."
            className="cursor-not-allowed rounded-md border border-line px-4 py-2 font-sans text-xs font-semibold text-ink-faint"
          >
            Publicar (Phase 07)
          </button>
        </div>
      </div>

      {!resolved?.ok && project.status !== "generating" && (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-panel p-8">
          <h2 className="font-sans text-lg font-semibold">Este website ainda não foi gerado</h2>
          <p className="max-w-lg text-sm leading-relaxed text-ink-dim">
            {project.briefJson
              ? "O briefing está guardado. Gera o website a partir dele — a engine interpreta o negócio, constrói o design system e as secções, e valida tudo antes de mostrar o resultado."
              : "Ainda não há briefing para este projeto. Cria um projeto novo para correr o fluxo completo: briefing → assets → direção visual → geração."}
          </p>
          {project.briefJson ? (
            <form action={generateProjectForm}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="brief" value={typeof project.briefJson === "string" ? project.briefJson : JSON.stringify(project.briefJson)} />
              <button
                type="submit"
                className="rounded-md bg-accent px-5 py-2.5 font-sans text-sm font-semibold text-base hover:opacity-90"
              >
                Gerar website
              </button>
            </form>
          ) : (
            <Link
              href="/projects/new"
              className="rounded-md bg-accent px-5 py-2.5 font-sans text-sm font-semibold text-base hover:opacity-90"
            >
              Criar projeto
            </Link>
          )}
        </div>
      )}

      {resolved?.ok && (
        <>
          <HubEditor
            projectId={project.id}
            previewSrc={`/preview/${project.previewToken}/site`}
            pages={hubPages}
            assets={assets.map((a) => ({
              id: a.id,
              filename: a.filename,
              width: a.width,
              height: a.height,
              kind: a.kind,
            }))}
          />

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="font-sans text-base font-semibold">Qualidade</h2>
              {quality && (
                <>
                  <p className="mt-1 text-xs text-ink-dim">
                    {quality.checks.filter((c) => c.passed).length}/{quality.checks.length} checks
                    passados · {quality.counts.critical} críticos · {quality.counts.warning} avisos ·{" "}
                    {quality.counts.suggestion} sugestões
                  </p>
                  <ul className="mt-4 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                    {quality.issues.length === 0 && (
                      <li className="text-xs text-accent">Sem issues detetadas.</li>
                    )}
                    {quality.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span
                          className={
                            issue.severity === "critical"
                              ? "text-error"
                              : issue.severity === "warning"
                                ? "text-amber-300"
                                : "text-ink-faint"
                          }
                        >
                          {issue.severity === "critical" ? "✕" : issue.severity === "warning" ? "!" : "·"}
                        </span>
                        <span className="text-ink-dim">{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="font-sans text-base font-semibold">Versões</h2>
              <p className="mt-1 text-xs text-ink-dim">
                Imutáveis — restaurar cria sempre uma versão nova.
              </p>
              <ul className="mt-4 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {versionRows.map(({ version, diff }) => (
                  <li key={version.id} className="flex items-center justify-between gap-3 rounded-md border border-line-soft bg-panel2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">
                        v{version.number}
                        <span className="ml-2 font-normal text-ink-faint">{version.message}</span>
                      </p>
                      <p className="text-[10px] text-ink-faint">
                        {new Date(version.createdAt).toLocaleString("pt-PT")}
                        {diff && (
                          <span className="ml-2">
                            {diff.sectionsAdded.length > 0 && `+${diff.sectionsAdded.length} `}
                            {diff.sectionsRemoved.length > 0 && `−${diff.sectionsRemoved.length} `}
                            {diff.sectionsChanged.length > 0 && `~${diff.sectionsChanged.length} `}
                            {diff.themeChanged && "tema "}
                            {diff.navigationChanged && "nav "}
                          </span>
                        )}
                      </p>
                    </div>
                    <form action={restoreVersionForm}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="versionId" value={version.id} />
                      <button
                        type="submit"
                        disabled={version.number === versions[0].number}
                        className="text-[11px] text-ink-dim hover:text-ink disabled:opacity-40"
                      >
                        Restaurar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={createVersionForm} className="mt-3 flex gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <input
                  name="message"
                  defaultValue=""
                  placeholder="Nota da versão"
                  className="flex-1 rounded border border-line bg-panel px-2.5 py-1.5 text-xs outline-none focus:border-accent/60"
                />
                <button type="submit" className="rounded border border-line px-3 py-1.5 text-xs text-ink-dim hover:text-ink">
                  Snapshot
                </button>
              </form>
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
            <form action={regeneratePreviewTokenForm}>
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit" className="rounded border border-line px-3 py-1.5 text-xs text-ink-dim hover:text-ink">
                Regenerar token de preview
              </button>
            </form>
            <form action={archiveProjectForm}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="archive" value={project.status === "archived" ? "0" : "1"} />
              <button type="submit" className="rounded border border-line px-3 py-1.5 text-xs text-ink-dim hover:text-ink">
                {project.status === "archived" ? "Restaurar projeto" : "Arquivar projeto"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}


