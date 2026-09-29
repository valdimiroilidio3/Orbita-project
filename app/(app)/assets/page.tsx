import type { Metadata } from "next";
import Link from "next/link";
import { listOrgAssets } from "@/lib/db";
import { requireOrg } from "@/lib/server/authz";

export const metadata: Metadata = { title: "Assets" };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AssetsPage() {
  const { organization } = await requireOrg();
  const assets = listOrgAssets(organization.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Media library por organização. Faz upload no wizard do projeto ou no hub — aqui vês tudo
          num só sítio.
        </p>
      </div>
      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-12 text-center">
          <p className="font-sans text-base text-ink-dim">Ainda não há assets.</p>
          <p className="mt-1 text-sm text-ink-faint">
            <Link href="/projects/new" className="text-accent hover:underline">
              Criar um projeto
            </Link>{" "}
            e carregar o logo e as imagens.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel2 text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Ficheiro</th>
                <th className="px-4 py-2.5 font-medium">Projeto</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Dimensões</th>
                <th className="px-4 py-2.5 font-medium">Tamanho</th>
                <th className="px-4 py-2.5 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, i) => (
                <tr key={a.id} className={i > 0 ? "border-t border-line-soft bg-panel" : "bg-panel"}>
                  <td className="px-4 py-3">
                    <span className="text-ink">{a.filename}</span>
                    <span className="ml-2 rounded bg-panel2 px-1.5 py-0.5 font-sans text-[10px] uppercase text-ink-faint">{a.kind}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-dim">{a.projectName}</td>
                  <td className="px-4 py-3 text-ink-dim">{a.mimeType}</td>
                  <td className="px-4 py-3 text-ink-dim">{a.width ? `${a.width}×${a.height}` : "—"}</td>
                  <td className="px-4 py-3 text-ink-dim">{formatBytes(a.sizeBytes)}</td>
                  <td className="px-4 py-3 text-ink-faint">
                    {new Date(a.createdAt).toLocaleDateString("pt-PT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
