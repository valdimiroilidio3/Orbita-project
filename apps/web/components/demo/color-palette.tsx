import { SectionHeader } from '@/components/ui/section-header';

interface Swatch {
  name: string;
  token: string;
  value: string;
  usage: string;
  dark?: boolean;
}

const PALETTE: Swatch[] = [
  {
    name: 'Primary',
    token: '--color-primary',
    value: '#1769E0',
    usage: 'Ações prioritárias, ativos',
    dark: true,
  },
  {
    name: 'Primary hover',
    token: '--color-primary-hover',
    value: '#1258C4',
    usage: 'Hover da ação primária',
    dark: true,
  },
  {
    name: 'Accent',
    token: '--color-accent',
    value: '#69A7FF',
    usage: 'Destaques de apoio',
    dark: true,
  },
  {
    name: 'Soft blue',
    token: '--color-soft-blue',
    value: '#EAF3FF',
    usage: 'Fundos suaves, foco suave',
  },
  {
    name: 'Background',
    token: '--color-background',
    value: '#F6F8FC',
    usage: 'Canvas da aplicação',
  },
  {
    name: 'Surface',
    token: '--color-surface',
    value: '#FFFFFF',
    usage: 'Cartões, sidebar, topbar',
  },
  { name: 'Text', token: '--color-text', value: '#17243A', usage: 'Texto principal', dark: true },
  { name: 'Text secondary', token: '--color-muted', value: '#6B7890', usage: 'Texto secundário' },
  { name: 'Border', token: '--color-border', value: '#E3EAF4', usage: 'Bordas e separadores' },
  {
    name: 'Success',
    token: '--color-success',
    value: '#15966A',
    usage: 'Conclusão, ativo',
    dark: true,
  },
  {
    name: 'Warning',
    token: '--color-warning',
    value: '#D99118',
    usage: 'Atenção, em pausa',
    dark: true,
  },
  {
    name: 'Danger',
    token: '--color-danger',
    value: '#D64545',
    usage: 'Erro, destrutivo',
    dark: true,
  },
  { name: 'Focus ring', token: '--color-focus', value: '#8AB8FF', usage: 'Anel de foco WCAG' },
];

/** Paleta oficial — tokens CSS + valores hex + uso previsto. */
export function ColorPalette() {
  return (
    <section aria-labelledby="palette-heading" className="space-y-5">
      <SectionHeader
        title="Paleta de cores"
        description="Azul reservado a ações prioritárias e destaques. Superfícies luminosas para utilização prolongada."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTE.map((swatch) => (
          <div
            key={swatch.token}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <span
              className="h-12 w-12 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: swatch.value }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-small font-semibold">{swatch.name}</p>
              <p className="truncate font-mono text-caption text-muted">
                {swatch.value} · {swatch.token}
              </p>
              <p className="text-caption text-muted">{swatch.usage}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
