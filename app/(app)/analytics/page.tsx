import type { Metadata } from "next";
import { countProjectsByStatus, listProjects } from "@/lib/db";
import { requireOrg } from "@/lib/server/authz";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { organization } = await requireOrg();
  const projects = listProjects(organization.id);
  const counts = countProjectsByStatus(organization.id);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const funnel = [
    { label: "Projetos criados", value: total },
    { label: "Briefings guardados", value: projects.filter((p) => p.briefJson).length },
    { label: "Websites gerados", value: projects.filter((p) => p.schemaJson).length },
    { label: "Prontos para publicar", value: (counts.ready ?? 0) + (counts.published ?? 0) },
    { label: "Publicados", value: counts.published ?? 0 },
  ];
  const max = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Métricas reais da tua organização — o funil de produção de websites. Analytics de
          tráfego dos sites publicados chega na Phase 08.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-panel p-6">
        <h2 className="font-sans text-base font-semibold">Funil de produção</h2>
        <div className="mt-5 flex flex-col gap-3">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-4">
              <span className="w-48 shrink-0 text-xs text-ink-dim">{f.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-panel2">
                <div
                  className="h-full rounded bg-accent/80"
                  style={{ width: `${Math.round((f.value / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right font-sans text-sm font-semibold">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-sans text-3xl font-semibold">{counts.archived ?? 0}</p>
          <p className="mt-1 text-xs text-ink-dim">Projetos arquivados</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-sans text-3xl font-semibold">{counts.generating ?? 0}</p>
          <p className="mt-1 text-xs text-ink-dim">A gerar agora</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-sans text-3xl font-semibold">
            {total ? Math.round((funnel[2].value / Math.max(1, total)) * 100) : 0}%
          </p>
          <p className="mt-1 text-xs text-ink-dim">Projetos com website gerado</p>
        </div>
      </div>
    </div>
  );
}
