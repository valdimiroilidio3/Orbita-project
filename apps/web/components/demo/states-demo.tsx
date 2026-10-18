'use client';

import { Inbox, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';

interface DemoRow {
  id: string;
  label: string;
}

const COLUMNS: DataColumn<DemoRow>[] = [
  { key: 'label', header: 'Coluna', cell: (row) => row.label },
  { key: 'value', header: 'Valor', cell: () => '—', align: 'right' },
];

/** Demonstração: loading, skeleton, erro e estado vazio. */
export function StatesDemo() {
  const [showLoading, setShowLoading] = useState(true);

  return (
    <section aria-labelledby="states-heading" className="space-y-6">
      <SectionHeader
        title="Estados"
        description="Carregamento, skeleton, erro e ausência de dados — sempre com saída clara."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="flex items-center justify-between gap-2 text-small font-semibold">
              Loading state
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLoading(false);
                  setTimeout(() => setShowLoading(true), 400);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Repetir
              </Button>
            </p>
          </CardHeader>
          <CardContent>
            {showLoading ? <LoadingState label="A carregar dados de demonstração" /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-small font-semibold">Skeleton</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>

      <ErrorState
        description="Não foi possível carregar os dados de demonstração. Verifica a ligação e tenta novamente — ou consulta o README para configurar o Supabase."
        action={
          <Button variant="outline" onClick={() => undefined}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        }
      />

      <EmptyState
        icon={Inbox}
        title="Sem dados para mostrar"
        description="Quando existirem registos reais, aparecem aqui. Enquanto isso, cria o teu primeiro agente para começar."
        action={
          <Button>
            <Sparkles className="h-4 w-4" aria-hidden />
            Criar primeiro agente
          </Button>
        }
      />

      <DataTable
        columns={COLUMNS}
        data={[]}
        keyExtractor={(row) => row.id}
        loading
        loadingRows={3}
      />
    </section>
  );
}
