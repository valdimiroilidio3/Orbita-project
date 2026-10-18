import { DemoBanner } from '@/components/demo/demo-banner-static';
import { ColorPalette } from '@/components/demo/color-palette';
import { ControlsDemo } from '@/components/demo/controls-demo';
import { DataDemo } from '@/components/demo/data-demo';
import { OverlaysDemo } from '@/components/demo/overlays-demo';
import { StatesDemo } from '@/components/demo/states-demo';
import { TypeScale } from '@/components/demo/type-scale';
import { Separator } from '@/components/ui/separator';

export default function DesignSystemPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <p className="text-caption font-semibold uppercase tracking-widest text-primary">
          Demonstração · Fase 02
        </p>
        <h1 className="text-display">Design System ORBITA CHAT</h1>
        <p className="max-w-[var(--container-prose)] text-body text-muted">
          Componentes oficiais da plataforma: identidade visual, tipografia, controles, dados e
          estados. Todos os dados desta página são fictícios e identificados como demonstração.
        </p>
        <DemoBanner />
      </div>

      <ColorPalette />
      <Separator />
      <TypeScale />
      <Separator />
      <ControlsDemo />
      <Separator />
      <OverlaysDemo />
      <Separator />
      <DataDemo />
      <Separator />
      <StatesDemo />
    </div>
  );
}
