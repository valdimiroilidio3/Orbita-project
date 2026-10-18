import { Orbit } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-12">
      <Link href="/overview" className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <Orbit className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-xl font-bold tracking-tight">ORBITA CHAT</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-overlay">
        {children}
      </div>
      <p className="mt-6 max-w-md text-center text-xs text-muted">
        Protótipo do Sprint 1 — a autenticação será ligada ao Supabase Auth numa fase seguinte.
      </p>
    </div>
  );
}
