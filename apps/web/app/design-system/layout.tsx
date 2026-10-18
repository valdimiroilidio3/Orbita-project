import { ArrowLeft, FlaskConical } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Design System · Demonstração',
  description: 'Página interna de demonstração do design system ORBITA CHAT (desenvolvimento).',
  robots: { index: false, follow: false },
};

/**
 * Layout da página de demonstração — rota claramente identificada
 * como interna/desenvolvimento; fora do produto e não indexada.
 */
export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[var(--container-content)] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
            <FlaskConical className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-small font-bold">ORBITA CHAT — Design System</p>
            <p className="text-caption text-muted">
              Página de demonstração (interna · não faz parte do produto)
            </p>
          </div>
          <Link
            href="/overview"
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-small font-medium text-text transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar à app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[var(--container-content)] px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
