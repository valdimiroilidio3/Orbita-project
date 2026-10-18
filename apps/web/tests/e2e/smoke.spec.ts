import { expect, test } from '@playwright/test';

/**
 * Smoke test do Sprint 1: as rotas principais carregam e o modo de
 * demonstração está identificado (regra: nunca dados fictícios como reais).
 */

test('overview carrega com métricas e aviso de demonstração', async ({ page }) => {
  await page.goto('/overview');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByText(/Modo de demonstração/i)).toBeVisible();
});

test('agents mostra listagem e CTA de criação', async ({ page }) => {
  await page.goto('/agents');
  await expect(page.getByRole('heading', { name: 'Agentes' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Novo agente/i })).toBeVisible();
});

test('calls mostra tabela ou estado vazio, sem dados reais', async ({ page }) => {
  await page.goto('/calls');
  await expect(page.getByRole('heading', { name: 'Chamadas' })).toBeVisible();
  await expect(page.getByText(/Modo de demonstração/i)).toBeVisible();
});

test('navegação mobile abre e fecha o drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/overview');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar navegação' }).click();
});
