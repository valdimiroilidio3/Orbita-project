import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ORBITA ENGINE",
    template: "%s — ORBITA ENGINE",
  },
  description:
    "Sistema operativo de websites gerado por IA: Site Schema determinístico, component registry, visual editor e deploy.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
