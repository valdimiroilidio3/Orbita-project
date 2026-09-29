import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/server/authz";
import { PLAYBOOKS } from "@/lib/engine/playbooks";
import { componentLabel } from "@/lib/site-schema/catalog";

export const metadata: Metadata = { title: "Templates" };

const INDUSTRY_LABELS: Record<string, string> = {
  construction: "Construção",
  architecture: "Arquitectura",
  "real-estate": "Imobiliário",
  restaurant: "Restauração",
  retail: "Retail",
  fashion: "Moda",
  technology: "Tecnologia",
  agency: "Agência",
  "professional-services": "Serviços profissionais",
  health: "Saúde",
  travel: "Turismo",
  other: "Genérico",
};

export default async function TemplatesPage() {
  await requireOrg();
  const entries = Object.entries(PLAYBOOKS).filter(([id]) => id !== "other");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Cada template é um playbook determinístico: sequência de componentes, paleta base e
          tom. O resultado final depende sempre do teu briefing real — nada é inventado.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([id, playbook]) => (
          <div key={id} className="flex flex-col rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold">{INDUSTRY_LABELS[id] ?? id}</h2>
              <span className="font-sans text-[10px] uppercase tracking-widest text-ink-faint">{playbook.personality}</span>
            </div>
            <div className="mt-4 flex gap-1.5">
              {[playbook.palette.primary, playbook.palette.accent, playbook.palette.background, playbook.palette.foreground].map((c, i) => (
                <span key={i} title={c} className="h-6 w-6 rounded border border-line-soft" style={{ backgroundColor: c }} />
              ))}
            </div>
            <ul className="mt-4 flex flex-1 flex-col gap-1">
              {playbook.sequence.slice(0, 6).map((s) => (
                <li key={s.type + s.variant} className="text-xs text-ink-dim">
                  · {componentLabel(s.type)}
                  <span className="text-ink-faint"> · {s.variant}</span>
                </li>
              ))}
              {playbook.sequence.length > 6 && (
                <li className="text-xs text-ink-faint">+ {playbook.sequence.length - 6} mais…</li>
              )}
            </ul>
            <Link
              href={`/projects/new?industry=${id}`}
              className="mt-5 rounded-md border border-accent/40 px-4 py-2 text-center font-sans text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-base"
            >
              Usar este template
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
