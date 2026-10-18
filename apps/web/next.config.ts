import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@orbita/shared', '@orbita/database'],
  // Permite os previews de desenvolvimento em hosts dinâmicos (ambiente Arena).
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai'],
};

export default nextConfig;
