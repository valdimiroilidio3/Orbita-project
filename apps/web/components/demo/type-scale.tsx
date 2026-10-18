import { SectionHeader } from '@/components/ui/section-header';

const SCALE = [
  {
    token: '--text-display',
    className: 'text-display',
    sample: 'Display — títulos de destaque',
    meta: '36 / 44 · 700',
  },
  {
    token: '--text-h1',
    className: 'text-h1',
    sample: 'H1 — título da página',
    meta: '30 / 36 · 700',
  },
  {
    token: '--text-h2',
    className: 'text-h2',
    sample: 'H2 — secção principal',
    meta: '24 / 32 · 650',
  },
  {
    token: '--text-h3',
    className: 'text-h3',
    sample: 'H3 — subsecção ou cartão',
    meta: '20 / 28 · 600',
  },
  {
    token: '--text-body',
    className: 'text-body',
    sample: 'Body — conteúdo normal para leitura confortável.',
    meta: '16 / 24 · 400',
  },
  {
    token: '--text-small',
    className: 'text-small',
    sample: 'Small — informação secundária e dados operacionais.',
    meta: '14 / 20 · 400',
  },
  {
    token: '--text-caption',
    className: 'text-caption',
    sample: 'Caption — metadados, carimbos temporais, legendas.',
    meta: '12 / 16 · 400',
  },
  {
    token: '--text-label',
    className: 'text-label',
    sample: 'Label — rótulos de formulário',
    meta: '13 / 18 · 550',
  },
] as const;

/** Escala tipográfica oficial (Inter, pesos contidos). */
export function TypeScale() {
  return (
    <section aria-labelledby="type-heading" className="space-y-5">
      <SectionHeader
        title="Tipografia"
        description="Inter (ou sistema equivalente). Legibilidade de dados operacionais é prioritária."
      />
      <div className="divide-y divide-border rounded-lg border border-border bg-surface">
        {SCALE.map((row) => (
          <div
            key={row.token}
            className="flex flex-col gap-1 p-5 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <p className={row.className}>{row.sample}</p>
            <p className="shrink-0 font-mono text-caption text-muted">
              {row.meta} · {row.token}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
