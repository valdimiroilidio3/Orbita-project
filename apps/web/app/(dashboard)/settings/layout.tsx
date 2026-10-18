import { SettingsNav } from '@/components/settings/settings-nav';
import { PageHeader } from '@/components/ui/page-header';

export const dynamic = 'force-dynamic';

/**
 * Layout das definições: cabeçalho comum + navegação própria (lateral em
 * ecrãs largos, horizontal com scroll em móvel) + conteúdo da secção.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Definições"
        description="Centro de controlo da conta e da organização. Estados reais; nada é simulado."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
