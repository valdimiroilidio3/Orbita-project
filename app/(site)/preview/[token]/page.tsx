import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db";
import { verifyPreviewToken } from "@/lib/preview/token";
import { StatusChip } from "../../../(app)/components/status-chip";
import PreviewFrame from "../../../(app)/components/preview-frame";
import PreviewToolbar from "./components/preview-toolbar";

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = verifyPreviewToken(token);
  if (!check) notFound();
  const project = getProject(check.projectId);
  if (!project) notFound();

  return (
    <div className="flex h-screen flex-col bg-base">
      <header className="flex h-12 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-accent" />
          <Link href="/dashboard" className="font-sans text-xs font-semibold tracking-[0.2em]">
            ORBITA
          </Link>
          <span className="text-xs text-ink-faint">preview</span>
          <span className="ml-2 border-l border-line pl-3 font-sans text-sm font-medium">{project.name}</span>
          <StatusChip status={project.status} />
        </div>
        <PreviewToolbar projectUrl={`/preview/${token}/site`} />
      </header>
      {project.schemaJson ? (
        <div className="min-h-0 flex-1">
          <PreviewFrame src={`/preview/${token}/site`} withToolbar={false} height="calc(100vh - 3rem)" />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <p className="font-sans text-lg font-semibold">Este website ainda não foi gerado</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              Abre o projeto no dashboard e corre a geração. O preview desta página atualiza
              automaticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
