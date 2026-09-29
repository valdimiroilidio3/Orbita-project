import type { Metadata } from "next";
import Link from "next/link";
import { listProjects } from "@/lib/db";
import { requireOrg } from "@/lib/server/authz";
import { StatusChip, relativeTime } from "../components/status-chip";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { organization } = await requireOrg();
  const projects = listProjects(organization.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-ink-dim">
            {projects.length} projeto{projects.length === 1 ? "" : "s"} · {organization.name}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          + Novo projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-14 text-center">
          <p className="font-sans text-lg text-ink-dim">Começa por aqui.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-faint">
            Descreve o negócio, carrega o logo e imagens, escolhe a direção visual e a engine gera
            o website completo a partir do Site Schema.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          {projects.map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 bg-panel px-5 py-4 ${i > 0 ? "border-t border-line-soft" : ""}`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Link href={`/projects/${p.id}`} className="truncate font-sans text-[15px] font-medium hover:text-accent">
                    {p.name}
                  </Link>
                  <StatusChip status={p.status} />
                </div>
                {p.description && <p className="truncate text-xs text-ink-faint">{p.description}</p>}
              </div>
              <div className="flex items-center gap-4 text-xs text-ink-faint">
                <span>{relativeTime(p.updatedAt)}</span>
                <Link href={`/projects/${p.id}`} className="text-ink-dim hover:text-ink">
                  Abrir
                </Link>
                <a href={`/preview/${p.previewToken}`} target="_blank" rel="noreferrer" className="text-ink-dim hover:text-ink">
                  Prever ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
