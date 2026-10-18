'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Iniciar sessão</h1>
        <p className="mt-1 text-sm text-muted">Acede ao teu workspace ORBITA CHAT.</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(
            'Autenticação ainda não ativa: o Supabase Auth será ligado no próximo sprint. Nenhum dado foi enviado.',
          );
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.pt"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Palavra-passe
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      {notice ? (
        <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-2.5 text-xs text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Recuperar palavra-passe
        </Link>
        <Link href="/overview" className="text-muted hover:text-text">
          Continuar em modo demo →
        </Link>
      </div>
    </div>
  );
}
