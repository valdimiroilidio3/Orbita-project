import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // O Next.js exige "jsx": "preserve" no tsconfig; o transform do Vitest
  // (rolldown/oxc) precisa de transformar JSX nos testes de componentes.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    // Espelha o alias "@/*" definido em apps/web/tsconfig.json.
    alias: {
      '@': path.resolve(rootDir, 'apps/web'),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/web/tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
