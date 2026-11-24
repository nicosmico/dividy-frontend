import { expect, test, type Page } from '@playwright/test';

import { serveDist, type DistServer } from './dist-server';
import { sampleGroups, seedGroups } from './seed';

/**
 * The "Hay una nueva versión de Dividy" toast, against the real build (`dist/`).
 * A "second build" is simulated by serving a `sw.js` whose bytes differ (one
 * extra comment): the browser treats any byte change as a new version, installs
 * it and, because the app uses `registerType: 'prompt'`, leaves it waiting until
 * the user taps "Recargar".
 *
 * The build is served by `serveDist` (its own server and origin per test), not
 * by the shared preview server: Playwright cannot intercept the service
 * worker's own update request with `route`, and changing `dist/sw.js` on disk
 * would affect the tests that run in parallel.
 */

const TOAST = 'Hay una nueva versión de Dividy';

test.skip(
  ({ browserName }) => browserName === 'webkit',
  'el service worker de Playwright WebKit no es confiable (ver offline.spec.ts)'
);

let server: DistServer;
test.beforeEach(async () => {
  server = await serveDist();
});
test.afterEach(async () => {
  await server.close();
});

type Marked = { __loaded?: boolean };

/** Opens the app and waits until a service worker controls the page. */
async function openControlled(page: Page) {
  await seedGroups(page, sampleGroups());
  await page.goto(`${server.origin}/`);
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The worker controls navigations from the next load on.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}

/** Asks the browser to look for a new `sw.js` now instead of waiting for it. */
async function checkForUpdate(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration!.update();
  });
}

const hasWaitingWorker = (page: Page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration?.waiting;
  });

test('primera visita y visitas sin cambios no muestran el aviso', async ({
  page,
}) => {
  await openControlled(page);
  await expect(page.getByText(TOAST)).toHaveCount(0);

  // Checking again finds the same bytes: nothing to announce.
  await checkForUpdate(page);
  expect(await hasWaitingWorker(page)).toBe(false);
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await expect(page.getByText(TOAST)).toHaveCount(0);
});

test('con una versión nueva aparece el aviso, no recarga solo y "Recargar" actualiza', async ({
  page,
}) => {
  await openControlled(page);
  await expect(page.getByText(TOAST)).toHaveCount(0);
  // A marker that only survives while this page is not reloaded.
  await page.evaluate(() => {
    (window as unknown as Marked).__loaded = true;
  });

  server.publishNewVersion('v2');
  await checkForUpdate(page);

  await expect(page.getByText(TOAST)).toBeVisible();
  // The new worker is installed but waiting, and the page was not reloaded.
  await expect.poll(() => hasWaitingWorker(page)).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as Marked).__loaded)
  ).toBe(true);

  // "Recargar" activates the new worker and reloads the page.
  const reloaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Recargar' }).click();
  await reloaded;
  expect(
    await page.evaluate(() => (window as unknown as Marked).__loaded)
  ).toBeUndefined();
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await expect(page.getByText(TOAST)).toHaveCount(0);
  // The new worker took over and the data is still there.
  await expect.poll(() => hasWaitingWorker(page)).toBe(false);
  await expect(page.getByText('Viaje a Pucón')).toBeVisible();
});
