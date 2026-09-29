import type { Metadata } from "next";
import Link from "next/link";
import { listProjects, countProjectsByStatus } from "@/lib/db";
import { requireOrg } from "@/lib/server/authz";
import { StatusChip, relativeTime } from "../components/status-chip";

export const metadata: Metadata = { title: "Dashboard" };

const ROADMAP = [
  { phase: "01", name: "Foundation", state: "done", note: "Next.js · TypeScript · Auth · DB multi-tenant" },
  { phase: "02", name: "Website Engine", state: "done", note: "Site Schema · Tokens · Registry · Renderer" },
  { phase: "03", name: "Visual Editor", state: "partial", note: "Núcleo ativo no hub (secções, conteúdo, reorder); canvas completo a seguir" },
  { phase: "04", name: "AI", state: "next", note: "Adapters prontos; template engine determinístico ativo" },
  { phase: "05", name: "Assets", state: "done", note: "Upload validado · media library" },
  { phase: "06", name: "Quality", state: "done", note: "SEO · acessibilidade (WCAG) · performance" },
  { phase: "07", name: "Deployment", state: "next", note: "GitHub · Vercel · domains" },
  { phase: "08", name: "SaaS", state: "next", note: "Billing · teams · analytics · templates" },
] as const;

function stateStyle(state: string) {
  if (state === "done") return "text-accent";
  if (state === "partial") return "text-amber-300";
  return "text-ink-faint";
}

export default async function DashboardPage() {
  const { organization } = await requireOrg();
  const projects = listProjects(organization.id);
  const counts = countProjectsByStatus(organization.id);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const ready = (counts.ready ?? 0) + (counts.published ?? 0);
  const draft = (counts.draft ?? 0) + (counts.generating ?? 0) + (counts.editing ?? 0);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-ink-faint">{organization.name}</p>
          <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight">Visão geral</h1>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90"
        >
          + Novo projeto
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        {[
          { label: "Projetos", value: total },
          { label: "Prontos", value: ready },
          { label: "Em curso", value: draft },
          { label: "Arquivados", value: counts.archived ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-panel px-5 py-4">
            <p className="font-sans text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs text-ink-dim">{s.label}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold">Projetos recentes</h2>
          <Link href="/projects" className="text-xs text-ink-dim hover:text-ink">
            Ver todos →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-10 text-center">
            <p className="font-sans text-base text-ink-dim">Ainda não tens projetos.</p>
            <p className="mt-1 text-sm text-ink-faint">Cria o primeiro: descreve o negócio, adiciona assets, gera o website.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            {projects.slice(0, 6).map((p, i) => (
              <div
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-3 bg-panel px-5 py-4 ${i > 0 ? "border-t border-line-soft" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <Link href={`/projects/${p.id}`} className="truncate font-sans text-[15px] font-medium hover:text-accent">
                    {p.name}
                  </Link>
                  <StatusChip status={p.status} />
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
      </section>

      <section>
        <h2 className="mb-4 font-sans text-lg font-semibold">Roadmap</h2>
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {ROADMAP.map((r) => (
            <div key={r.phase} className="bg-panel px-5 py-4">
              <div className="flex items-baseline gap-3">
                <span className={`font-sans text-xs tracking-widest ${stateStyle(r.state)}`}>PHASE {r.phase}</span>
                <span className="font-sans text-sm font-semibold">{r.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">{r.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
