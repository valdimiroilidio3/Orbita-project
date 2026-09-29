import type { Metadata } from "next";
import { signupAction } from "@/lib/server/actions";

const signupForm = signupAction as unknown as (fd: FormData) => void;

export const metadata: Metadata = { title: "Criar conta" };

const inputCls =
  "w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span aria-hidden className="h-3 w-3 rounded-[2px] bg-accent" />
          <span className="font-sans text-base font-semibold tracking-[0.22em]">ORBITA</span>
          <span className="font-sans text-[10px] tracking-[0.3em] text-ink-faint">ENGINE</span>
        </div>
        <div className="rounded-lg border border-line bg-panel p-7">
          {error && (
            <p role="alert" className="mb-4 rounded-md border border-error/50 bg-error/10 px-4 py-3 text-sm">
              {error}
            </p>
          )}
          <form action={signupForm} className="flex flex-col gap-4">
            <input type="hidden" name="callbackUrl" value="/dashboard" />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="name">Nome</label>
              <input id="name" name="name" type="text" required minLength={2} maxLength={80} autoComplete="name" placeholder="Valdimiro" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@estudio.pt" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="mín. 8 caracteres" className={inputCls} />
            </div>
            <button type="submit" className="mt-1 rounded-md bg-accent px-4 py-3 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90">
              Criar conta
            </button>
          </form>
          <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
            Criar a conta cria também o teu espaço de trabalho (organization) — multi-tenant desde o
            primeiro dia.
          </p>
        </div>
      </div>
    </div>
  );
}
