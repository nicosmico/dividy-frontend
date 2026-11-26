import { expect, test } from '@playwright/test';

import { sampleGroups, seedGroups } from './seed';

/**
 * A page opened before a new version was published asks for the old files of
 * each screen, which no longer exist. Simulated by making the Saldos file
 * fail once: the app reloads and the screen opens, instead of «Algo salió mal».
 */

// The service worker could serve the file from its cache and hide the failure.
test.use({ serviceWorkers: 'block' });

test('si falta el archivo de una pantalla (nueva versión publicada), recarga y la abre', async ({
  page,
}) => {
  await seedGroups(page, sampleGroups());
  await page.goto('/groups/g1/expenses');
  await expect(page.getByText('Total del grupo')).toBeVisible();

  let failed = 0;
  await page.route(/\/assets\/balances-[^/]+\.js$/, async (route) => {
    if (failed === 0) {
      failed += 1;
      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }
    await route.continue();
  });

  await page.getByRole('link', { name: 'Saldos' }).click();
  await expect(
    page.getByRole('heading', { name: 'Para quedar al día' })
  ).toBeVisible();
  expect(failed).toBe(1);
  await expect(page.getByText('Algo salió mal')).toHaveCount(0);
});

test('si el archivo sigue faltando, no recarga en bucle: pide recargar', async ({
  page,
}) => {
  await seedGroups(page, sampleGroups());
  await page.goto('/groups/g1/expenses');
  await expect(page.getByText('Total del grupo')).toBeVisible();

  let requests = 0;
  await page.route(/\/assets\/balances-[^/]+\.js$/, async (route) => {
    requests += 1;
    await route.fulfill({ status: 404, body: 'Not found' });
  });

  await page.getByRole('link', { name: 'Saldos' }).click();
  await expect(
    page.getByRole('heading', { name: 'Hay una nueva versión de Dividy' })
  ).toBeVisible();
  // One reload at most: the first try, and the one after reloading.
  expect(requests).toBeLessThanOrEqual(2);
});
