import { expect, test } from '@playwright/test';

import { sampleGroups, seedGroups } from './seed';

test('instalable: el manifest declara nombre, colores, idioma e íconos', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: 'Dividy',
    lang: 'es-CL',
    display: 'standalone',
    theme_color: '#F4F7F2',
    background_color: '#F4F7F2',
  });
  const icons = manifest.icons as {
    src: string;
    sizes: string;
    purpose?: string;
  }[];
  expect(icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512'])
  );
  expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png'
  );
});

test('tras cargar una vez, la app abre y funciona sin conexión', async ({
  page,
  context,
  browserName,
}) => {
  // Playwright's WebKit does not reliably serve a service worker's cache with
  // context.setOffline(true), so this would fail for reasons unrelated to the
  // app. Chromium covers the offline behavior.
  test.skip(
    browserName === 'webkit',
    'setOffline + service worker no es confiable en WebKit'
  );
  await seedGroups(page, sampleGroups());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();

  // Wait for the service worker to install and precache the app shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Navigations are controlled by the worker from the next load on.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);

  // A cold reload on the home page...
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await expect(page.getByText('Viaje a Pucón')).toBeVisible();

  // ...a deep link (its route chunk and the lazy avatar generator are in the precache)...
  await page.goto('/groups/g1/members');
  await expect(page.getByText('3 miembros')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cambiar avatar de Ana' }).locator('img')
  ).toBeVisible();

  // ...and writing still works, because the data lives in the browser.
  await page.getByLabel('Nombre', { exact: true }).fill('Dani');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await expect(page.getByText('4 miembros')).toBeVisible();

  await context.setOffline(false);
});
