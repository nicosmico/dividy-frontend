import { expect, test } from '@playwright/test';

import { sampleGroups, seedGroups } from './seed';
import { snapshotPath } from './snapshot-link';
import { skipViewerSheet } from './viewer';

const TAKEN = '2026-11-24T13:42:00.000Z';

test.describe('Preguntas frecuentes', () => {
  test('desde la bienvenida se llega a todas las preguntas', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ver todas las preguntas' }).click();
    await expect(page).toHaveURL(/\/preguntas$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })
    ).toBeVisible();
    await expect(page.locator('main details')).toHaveCount(7);
  });

  test('el ícono del encabezado abre las preguntas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Preguntas frecuentes' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })
    ).toBeVisible();
  });

  test('desde Saldos, "¿Por qué estas transferencias?" abre esa pregunta', async ({
    page,
  }) => {
    await seedGroups(page, sampleGroups());
    await page.goto('/groups/g1/balances');
    await page
      .getByRole('link', { name: '¿Por qué estas transferencias?' })
      .click();
    await expect(page).toHaveURL(/\/preguntas#transferencias$/);
    const item = page.locator('details#transferencias');
    await expect(item).toHaveAttribute('open', '');
    await expect(
      item.getByText('Busca la menor cantidad posible de transferencias')
    ).toBeVisible();
    await expect(item).toBeInViewport();

    // "Volver" goes back to Saldos, not to the start.
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/groups\/g1\/balances$/);
    await expect(
      page.getByRole('heading', { name: 'Para quedar al día' })
    ).toBeVisible();
  });

  test('un link con # abre su pregunta al cargar', async ({ page }) => {
    await page.goto('/preguntas#datos');
    await expect(page.locator('details#datos')).toHaveAttribute('open', '');
    await expect(page.locator('main details[open]')).toHaveCount(1);
  });

  test('desde una captura, "¿Qué es Dividy?" y volver conserva la captura', async ({
    page,
  }) => {
    const path = snapshotPath(sampleGroups()[0], TAKEN);
    await page.goto(path);
    await skipViewerSheet(page);
    const banner = page.getByRole('region', {
      name: 'Captura de solo lectura',
    });
    await expect(page.getByText('Supermercado')).toBeVisible();
    const before = new URL(page.url());
    expect(before.hash).toMatch(/^#v3\./);

    await banner.getByRole('link', { name: '¿Qué es Dividy?' }).click();
    await expect(page).toHaveURL(/\/preguntas$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })
    ).toBeVisible();

    await page.goBack();
    await expect(page.getByText('Supermercado')).toBeVisible();
    await expect(banner).toBeVisible();
    expect(new URL(page.url()).hash).toBe(before.hash);

    // The page's own "Volver" does the same as the browser's back.
    await banner.getByRole('link', { name: '¿Qué es Dividy?' }).click();
    await expect(page).toHaveURL(/\/preguntas$/);
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page.getByText('Supermercado')).toBeVisible();
    expect(new URL(page.url()).hash).toBe(before.hash);
  });

  test('abierta directamente, "Volver" lleva al inicio', async ({ page }) => {
    await page.goto('/preguntas');
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
