'use client';

import { ChevronDown, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SectionHeader } from '@/components/ui/section-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToastProvider, useToast } from '@/components/ui/toast';

/** Demonstração: tooltips, menus, modais, tabs e toasts. */
export function OverlaysDemo() {
  return (
    <ToastProvider>
      <OverlaysDemoContent />
    </ToastProvider>
  );
}

function OverlaysDemoContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <section aria-labelledby="overlays-heading" className="space-y-8">
        <SectionHeader
          title="Sobreposições e feedback"
          description="Menus, modais, tooltips, tabs e notificações — transições de 120–220 ms."
        />

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Informação de apoio discreta.</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Dropdown menu
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Conta demo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserRound aria-hidden />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings aria-hidden />
                Definições
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Item desativado</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir modal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Arquivar agente?</DialogTitle>
                <DialogDescription>
                  O agente deixa de estar disponível para novas chamadas. Podes reativá-lo mais
                  tarde nas definições. (Demonstração — nenhuma alteração será aplicada.)
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDialogOpen(false);
                    toast({
                      title: 'Ação de demonstração',
                      description: 'Nada foi alterado — modal apenas ilustrativo.',
                      variant: 'warning',
                    });
                  }}
                >
                  Arquivar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Alterações guardadas',
                description: 'Feedback de ação via toast (demonstração).',
                variant: 'success',
              })
            }
          >
            Mostrar toast (success)
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Não foi possível concluir',
                description: 'Exemplo de erro com saída clara.',
                variant: 'danger',
              })
            }
          >
            Mostrar toast (erro)
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Atividade</TabsTrigger>
              <TabsTrigger value="settings" disabled>
                Definições (em breve)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-small text-muted">
                Conteúdo da tab «Overview» — transição de opacidade discreta ao trocar.
              </p>
            </TabsContent>
            <TabsContent value="activity">
              <p className="text-small text-muted">
                Conteúdo da tab «Atividade» — dados de demonstração.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </TooltipProvider>
  );
}
