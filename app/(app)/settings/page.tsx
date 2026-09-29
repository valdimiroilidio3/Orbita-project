import type { Metadata } from "next";
import { updateProfileAction } from "@/lib/server/actions";

const updateProfileForm = updateProfileAction as unknown as (fd: FormData) => void;
import { requireOrg } from "@/lib/server/authz";

export const metadata: Metadata = { title: "Settings" };

const inputCls =
  "w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60";

export default async function SettingsPage() {
  const { user, organization } = await requireOrg();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-ink-dim">Perfil e workspace.</p>
      </div>

      <section className="rounded-lg border border-line bg-panel p-6">
        <h2 className="font-sans text-base font-semibold">Perfil</h2>
        <form action={updateProfileForm} className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" required minLength={2} maxLength={80} defaultValue={user.name ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="email">Email</label>
            <input id="email" value={user.email ?? ""} disabled className={`${inputCls} opacity-60`} />
            <p className="mt-1 text-[11px] text-ink-faint">O email de acesso não pode ser alterado ainda.</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-accent px-4 py-2 font-sans text-xs font-semibold text-base hover:opacity-90">
              Guardar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-panel p-6">
        <h2 className="font-sans text-base font-semibold">Workspace</h2>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-faint">Nome</dt>
            <dd>{organization.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-faint">Slug</dt>
            <dd className="font-mono text-xs">{organization.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-faint">O teu papel</dt>
            <dd>owner</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-line-soft pt-3 text-[11px] leading-relaxed text-ink-faint">
          Multi-tenancy: todos os teus projetos, assets e versões ficam isolados neste workspace.
          O isolamento é aplicado na camada de dados (membership check em cada query).
        </p>
      </section>
    </div>
  );
}
