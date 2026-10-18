import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ORBITA CHAT',
    template: '%s · ORBITA CHAT',
  },
  description:
    'Plataforma SaaS multiempresa de agentes de voz IA — gestão de agentes, chamadas, contactos e integrações.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen bg-background font-sans text-text antialiased">{children}</body>
    </html>
  );
}
