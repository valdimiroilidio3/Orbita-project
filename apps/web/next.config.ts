import type { NextConfig } from 'next';

/**
 * Headers de segurança (produção e desenvolvimento).
 *
 * CSP: Next.js injeta scripts inline para hidratação → 'unsafe-inline' em
 * script-src é necessário sem nonces (documentado em docs/production-readiness.md
 * como melhoria futura). `connect-src` autoriza apenas o próprio origin e o
 * Supabase (URL pública). `frame-ancestors` permite embedding apenas nos
 * previews de desenvolvimento (NODE_ENV !== 'production') ou com o opt-in
 * explícito ALLOW_FRAME_EMBEDDING=true (apenas previews; nunca em produção).
 */
const isProduction = process.env.NODE_ENV === 'production';
// Opt-in explícito para previews embebidos (iframe) de um build de produção.
// NUNCA definir em produção real — por defeito o embedding é negado.
const allowFrameEmbedding = process.env.ALLOW_FRAME_EMBEDDING === 'true';
const denyFraming = isProduction && !allowFrameEmbedding;
const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProduction ? '' : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  denyFraming ? "frame-ancestors 'none'" : 'frame-ancestors *',
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(denyFraming ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@orbita/shared', '@orbita/database'],
  // Permite os previews de desenvolvimento em hosts dinâmicos (ambiente Arena).
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
