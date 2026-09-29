import type { Metadata } from "next";
import { loginAction } from "@/lib/server/actions";

/** Forms discard the action's return value; clients `await` the action
 *  directly when they need it. The cast only satisfies React 19's void
 *  form-action typing — the runtime reference is the original action. */
const loginForm = loginAction as unknown as (fd: FormData) => void;

export const metadata: Metadata = { title: "Entrar" };

const inputCls =
  "w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
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
          <form action={loginForm} className="flex flex-col gap-4">
            <input type="hidden" name="callbackUrl" value="/dashboard" />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@estudio.pt" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-dim" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={inputCls} />
            </div>
            <button type="submit" className="mt-1 rounded-md bg-accent px-4 py-3 font-sans text-sm font-semibold text-base transition-opacity hover:opacity-90">
              Entrar
            </button>
          </form>
          <div className="mt-5 rounded-md border border-line-soft bg-panel2 px-4 py-3 text-xs leading-relaxed text-ink-dim">
            <span className="font-medium text-ink">Demo</span> (só ambiente local):{" "}
            <code className="text-accent">demo@orbita.dev</code> · <code className="text-accent">orbita-demo-2026</code>
          </div>
        </div>
      </div>
    </div>
  );
}
