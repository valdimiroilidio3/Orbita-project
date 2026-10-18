'use client';

import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

/** Demonstração: botões, formulários, badges e controlos base. */
export function ControlsDemo() {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [language, setLanguage] = useState('pt-PT');
  const [agree, setAgree] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <section aria-labelledby="controls-heading" className="space-y-8">
      <SectionHeader
        title="Controles"
        description="Botões, campos de formulário e estados de interação (hover, focus, disabled, loading)."
      />

      {/* Botões */}
      <div className="space-y-4">
        <h3 className="text-h3">Botões</h3>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-5">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4" aria-hidden />
            Destructive
          </Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-5">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <IconButton label="Descarregar">
            <Download className="h-4 w-4" aria-hidden />
          </IconButton>
          <Button disabled>Disabled</Button>
          <Button
            loading={loadingDemo}
            onClick={() => {
              setLoadingDemo(true);
              setTimeout(() => setLoadingDemo(false), 1600);
            }}
          >
            {loadingDemo ? 'A guardar…' : 'Testar loading'}
          </Button>
          <Button variant="outline" loading>
            Loading
          </Button>
        </div>
      </div>

      {/* Formulários */}
      <div className="space-y-4">
        <h3 className="text-h3">Campos de formulário</h3>
        <div className="grid grid-cols-1 gap-5 rounded-lg border border-border bg-surface p-5 lg:grid-cols-2">
          <FormField label="Nome do agente" hint="Visível apenas na tua organização." required>
            {({ id, describedBy, invalid, required }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                required={required}
                placeholder="Ex.: Rececionista Virtual"
                defaultValue=""
              />
            )}
          </FormField>

          <FormField label="Email" error="Introduz um email profissional válido.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder="tu@empresa.pt"
                defaultValue="inválido@"
              />
            )}
          </FormField>

          <FormField label="Idioma" hint="Idioma principal do agente.">
            {({ id }) => (
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id={id} aria-label="Idioma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">Inglês (EUA)</SelectItem>
                  <SelectItem value="es-ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="Campo desativado" hint="Estado disabled com contraste suficiente.">
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} disabled value="Valor fixo" readOnly />
            )}
          </FormField>

          <div className="lg:col-span-2">
            <FormField
              label="Instruções"
              hint="Define o comportamento do agente. Máximo 20 000 caracteres."
            >
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Ex.: Sê breve, cordial e confirma sempre o motivo da chamada…"
                />
              )}
            </FormField>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="agree"
                checked={agree}
                onCheckedChange={(value) => setAgree(value === true)}
              />
              <Label htmlFor="agree" required>
                Aceito os termos de utilização
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                aria-describedby="notifications-label"
              />
              <Label htmlFor="notifications" id="notifications-label">
                Notificações de chamadas falhadas ({notifications ? 'ativas' : 'inativas'})
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-4">
        <h3 className="text-h3">Badges e estados</h3>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-5">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </div>
    </section>
  );
}
