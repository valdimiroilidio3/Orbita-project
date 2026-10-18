import { Orbit } from 'lucide-react';

export const metadata = {
  title: 'Configurar workspace',
};

/**
 * Layout do onboarding — utilizador autenticado sem organização.
 * Protegido pelo middleware; a autorização real é o RLS + sessão validada.
 */
// Onboarding depende da sessão — nunca pré-renderizar.
export const dynamic = 'force-dynamic';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <Orbit className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-xl font-bold tracking-tight">ORBITA CHAT</span>
      </div>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 shadow-md">
        {children}
      </div>
    </div>
  );
}
