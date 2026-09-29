import type { ReactNode } from "react";
import { signOutAction } from "@/lib/server/actions";
import { requireUser } from "@/lib/server/authz";
import TopNav from "./components/top-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-50 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <a href="/dashboard" className="flex items-center gap-2.5">
              <span aria-hidden className="h-3 w-3 rounded-[2px] bg-accent" />
              <span className="font-sans text-sm font-semibold tracking-[0.22em]">ORBITA</span>
              <span className="font-sans text-[10px] tracking-[0.3em] text-ink-faint">ENGINE</span>
            </a>
            <TopNav />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-ink-dim sm:block">{user.name}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-xs text-ink-faint transition-colors hover:text-ink">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
