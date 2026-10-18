'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recuperar palavra-passe</h1>
        <p className="mt-1 text-sm text-muted">
          Envia um link de recuperação para o email da tua conta.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(
            'Recuperação ainda não ativa: será implementada com Supabase Auth no próximo sprint. Nenhum email foi enviado.',
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
        <Button type="submit" className="w-full">
          Enviar link de recuperação
        </Button>
      </form>

      {notice ? (
        <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-2.5 text-xs text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}

      <Link href="/login" className="block text-sm text-primary hover:underline">
        ← Voltar ao início de sessão
      </Link>
    </div>
  );
}
