import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { openTab } from './navigation';
import { sampleGroups, seedDocument } from './seed';
import { snapshotToken } from './snapshot-link';
import { makeGroup } from '../src/domain/test-utils/fixtures';

declare global {
  interface Window {
    __shared?: { title?: string; text?: string };
  }
}

/** Makes `navigator.share` record what it receives (no OS share sheet in a test). */
async function stubShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { title?: string; text?: string }) => {
        window.__shared = data;
      },
    });
  });
}

/** A new browser context without any data, shaped like the project (desktop or phone). */
async function freshContext(
  browser: Browser,
  testInfo: TestInfo
): Promise<BrowserContext> {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    testInfo.project.use;
  return browser.newContext({
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  });
}

async function createGroup(page: Page, name: string, members: string[]) {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill(name);
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const member of members) {
    await memberInput.fill(member);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
}

async function addExpense(
  page: Page,
  expense: {
    description: string;
    amount: number;
    payer?: string;
    without?: string[];
  }
) {
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill(expense.description);
  await dialog.getByLabel('Monto en pesos').fill(String(expense.amount));
  if (expense.payer) {
    await dialog.getByLabel('Pagado por').click();
    await page.getByRole('option', { name: expense.payer }).click();
  }
  for (const name of expense.without ?? []) {
    await dialog.getByRole('checkbox', { name }).click();
  }
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
}

/** The "Saldo por miembro" list, one text per member (the chart repeats the same words). */
async function balanceTexts(page: Page): Promise<string[]> {
  const section = page
    .getByRole('heading', { name: 'Saldo por miembro' })
    .locator('xpath=ancestor::section[1]');
  return section.locator('li').allInnerTexts();
}

/** Presses "Compartir resumen" and returns the text it shared and the link inside it. */
async function shareSummary(page: Page) {
  await page.evaluate(() => {
    window.__shared = undefined;
  });
  await page.getByRole('button', { name: 'Compartir resumen' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__shared?.text))
    .toBeTruthy();
  const text = (await page.evaluate(() => window.__shared?.text)) as string;
  const link = /Ver el detalle: (\S+)$/.exec(text)?.[1];
  expect(link, 'el resumen termina con el link').toBeTruthy();
  return { text, link: link as string };
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('compartir por link: abrir sin datos, solo lectura, guardar, actualizar, aviso de más vieja y eliminar', async ({
  page,
  browser,
}, testInfo) => {
  // --- The owner: a group with expenses and a payment, then "Compartir resumen".
  await stubShare(page);
  await createGroup(page, 'Viaje a Pucón', ['Ana', 'Beto', 'Carla']);
  await addExpense(page, { description: 'Supermercado', amount: 10000 });
  await addExpense(page, {
    description: 'Taxi',
    amount: 3000,
    payer: 'Beto',
    without: ['Carla'],
  });
  await openTab(page, 'Saldos');
  await page
    .getByRole('button', { name: /^Marcar como pagado/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Sí, registrar pago' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pagos registrados' })
  ).toBeVisible();
  await expect(
    page.getByText(
      'Incluye un link de solo lectura. Quien lo tenga verá los nombres, gastos y pagos del grupo.'
    )
  ).toBeVisible();
  const originalBalances = await balanceTexts(page);
  expect(originalBalances).toHaveLength(3);
  const first = await shareSummary(page);
  expect(first.text).toContain('*Viaje a Pucón*');
  expect(first.link).toMatch(/\/shared#v1\.[A-Za-z0-9_-]+$/);
  expect(first.link).not.toContain('?');

  // --- Someone else, with a brand new browser (no data at all), opens the link.
  const context = await freshContext(browser, testInfo);
  const other = await context.newPage();
  await other.goto(first.link);
  const banner = other.getByRole('region', { name: 'Captura de solo lectura' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Captura del');
  await expect(banner).toContainText(
    'Es solo para ver: los cambios que se hagan en el grupo original no aparecen aquí.'
  );
  await expect(banner.locator('svg.lucide-eye')).toBeVisible();
  // First visit: straight to the capture, not the welcome screen.
  await expect(
    other.getByRole('heading', { name: 'Viaje a Pucón', level: 1 })
  ).toBeVisible();
  await expect(
    other.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toHaveCount(0);
  await expect(other).toHaveURL(/\/shared\/expenses#v1\./);
  await expect(other.getByText('Supermercado')).toBeVisible();
  await expect(other.getByText('$13.000', { exact: true })).toBeVisible();

  // Read only: no way to change anything.
  await expect(
    other.getByRole('button', { name: /Agregar gasto/ })
  ).toHaveCount(0);
  await expect(other.getByRole('button', { name: /Supermercado/ })).toHaveCount(
    0
  );
  await expect(
    other
      .getByRole('navigation', { name: 'Secciones del grupo' })
      .getByRole('link')
  ).toHaveText(['Gastos', 'Saldos']);
  await expect(other.getByRole('link', { name: 'Miembros' })).toHaveCount(0);
  await expect(
    other.getByRole('button', { name: 'Opciones del grupo' })
  ).toHaveCount(0);
  await expectNoHorizontalScroll(other);

  // Saldos: the same numbers, nothing to register or delete.
  await openTab(other, 'Saldos');
  await expect(other).toHaveURL(/\/shared\/balances#v1\./);
  expect(await balanceTexts(other)).toEqual(originalBalances);
  await expect(
    other.getByRole('button', { name: /Marcar como pagado/ })
  ).toHaveCount(0);
  await expect(
    other.getByRole('button', { name: /Eliminar pago/ })
  ).toHaveCount(0);
  await expect(
    other.getByRole('heading', { name: 'Pagos registrados' })
  ).toBeVisible();
  // Scrolled down, the full notice is gone but a one-line bar stays on top.
  // (mouse.wheel does not exist in mobile WebKit, so scroll the window.)
  await other.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  await expect(banner).not.toBeInViewport();
  const compact = other.getByTestId('snapshot-compact-banner');
  await expect(compact).toBeVisible();
  await expect(compact).toContainText(/Captura del .+ · solo lectura/);
  await expect(compact).toBeInViewport();
  await other.evaluate(() => window.scrollTo(0, 0));
  await expect(banner).toBeInViewport();
  await expect(compact).toBeHidden();
  await expectNoHorizontalScroll(other);

  // "Ver cómo se calculó" and "Ver como tabla" still work.
  await other.getByRole('button', { name: /Ver cómo se calculó/ }).click();
  await expect(
    other.getByRole('dialog', { name: 'Cómo se calculó' })
  ).toBeVisible();
  await other.keyboard.press('Escape');
  await expect(
    other.getByRole('dialog', { name: 'Cómo se calculó' })
  ).toBeHidden();
  await other.getByText('Ver como tabla').click();
  await expect(other.getByRole('table').first()).toBeVisible();

  // The summary of a capture says "Cuentas al" and shares the same link.
  await stubShare(other);
  await other.reload();
  await expect(banner).toBeVisible();
  await expect(other.getByText('Saldo por miembro')).toBeVisible();
  const reshared = await shareSummary(other);
  expect(reshared.text).toMatch(/\*Viaje a Pucón\*\nCuentas al \d/);
  expect(reshared.link).toBe(first.link);

  // Save it: it goes to "Compartidos conmigo" and survives a reload.
  await other.getByRole('button', { name: 'Guardar en mi celular' }).click();
  await expect(other.getByText('Captura guardada en Mis grupos')).toBeVisible();
  await expect(other.getByText('Ya está guardada en Mis grupos')).toBeVisible();
  await expect(
    other.getByRole('button', { name: /Guardar en mi celular/ })
  ).toHaveCount(0);
  await other.getByRole('link', { name: 'Dividy' }).click();
  await expect(
    other.getByRole('heading', { name: 'Mis grupos' })
  ).toBeVisible();
  const sharedSection = other.getByRole('region', {
    name: 'Compartidos conmigo · solo lectura',
  });
  await expect(sharedSection).toBeVisible();
  const card = sharedSection.getByRole('link', { name: /Viaje a Pucón/ });
  await expect(card).toContainText('Captura del');
  await expect(card.locator('svg.lucide-eye')).toBeVisible();
  await other.reload();
  await expect(card).toBeVisible();
  await expectNoHorizontalScroll(other);

  // A newer link replaces the saved capture.
  await openTab(page, 'Gastos');
  await addExpense(page, {
    description: 'Bencina',
    amount: 6000,
    payer: 'Carla',
  });
  await openTab(page, 'Saldos');
  const newer = await shareSummary(page);
  expect(newer.link).not.toBe(first.link);
  await other.goto(newer.link);
  await expect(
    other.getByRole('button', { name: 'Actualizar captura guardada' })
  ).toBeVisible();
  await other
    .getByRole('button', { name: 'Actualizar captura guardada' })
    .click();
  await expect(other.getByText('Captura actualizada')).toBeVisible();
  await expect(other.getByText('Ya está guardada en Mis grupos')).toBeVisible();
  await expect(
    other.getByRole('button', { name: /Guardar en mi celular/ })
  ).toHaveCount(0);

  // An older link does not replace it: it warns and leads to the newer one.
  await other.goto(first.link);
  await expect(
    other.getByText(/Ya tienes guardada una captura más nueva \(del /)
  ).toBeVisible();
  await expect(
    other.getByRole('button', { name: /Guardar en mi celular|Actualizar/ })
  ).toHaveCount(0);
  await other.getByRole('link', { name: 'Ver la más nueva' }).click();
  await expect(other).toHaveURL(/\/shared\/[^/]+\/expenses$/);
  await expect(other.getByText('Bencina')).toBeVisible();
  await expect(banner).toBeVisible();
  await expect(
    other.getByRole('button', { name: 'Guardar en mi celular' })
  ).toHaveCount(0);
  await openTab(other, 'Saldos');
  await expect(other).toHaveURL(/\/shared\/[^/]+\/balances$/);

  // Delete it, and undo.
  await other.getByRole('button', { name: 'Eliminar captura' }).click();
  await expect(other.getByText('Captura eliminada').last()).toBeVisible();
  await expect(other).toHaveURL(/\/$/);
  await other.getByRole('button', { name: 'Deshacer' }).click();
  await expect(sharedSection).toBeVisible();
  await expect(card).toBeVisible();
  await other
    .getByRole('button', { name: 'Eliminar captura de Viaje a Pucón' })
    .click();
  await expect(other.getByText('Captura eliminada').last()).toBeVisible();
  await expect(sharedSection).toHaveCount(0);
  await other.reload();
  await expect(
    other.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toBeVisible();

  // The owner's data was never touched by any of this.
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Viaje a Pucón/ })).toBeVisible();
  await expect(page.getByText('Compartidos conmigo')).toHaveCount(0);

  await context.close();
});

test('un link corrupto, truncado o de otra versión muestra una pantalla amable', async ({
  page,
}) => {
  const group = makeGroup({
    name: 'Casa',
    members: ['Ana', 'Beto'],
    expenses: [{ amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] }],
  });
  const token = snapshotToken(group, '2026-11-24T13:42:00.000Z');
  for (const hash of [
    '#v1.esto-no-es-una-captura',
    `#${token.slice(0, Math.floor(token.length / 2))}`,
    `#${token.replace(/^v1\./, 'v9.')}`,
    '',
  ]) {
    await page.goto(`/shared${hash}`);
    await expect(
      page.getByRole('heading', { name: 'Este link no se pudo abrir' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Puede estar incompleto o ser de una versión distinta de Dividy.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Captura de solo lectura' })
    ).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  }
  await page.getByRole('link', { name: 'Ir a Mis grupos' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toBeVisible();
});

test('un link armado por otro programa (zlib) también se abre', async ({
  page,
}) => {
  const group = makeGroup({
    name: 'Asado',
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Carne',
        amount: 10000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
    ],
  });
  await page.goto(
    `/shared#${snapshotToken(group, '2026-11-24T13:42:00.000Z')}`
  );
  await expect(
    page.getByRole('heading', { name: 'Asado', level: 1 })
  ).toBeVisible();
  await expect(page.getByText('Carne')).toBeVisible();
  await openTab(page, 'Saldos');
  await expect(page.getByText('Pendiente: $6.666 por saldar')).toBeVisible();
});

test('un documento v3 (sin capturas) se migra a v4 al guardar una captura, sin perder los grupos', async ({
  page,
}) => {
  const groups = sampleGroups();
  await seedDocument(page, { version: 3, groups });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Viaje a Pucón/ })).toBeVisible();
  await expect(page.getByText('Compartidos conmigo')).toHaveCount(0);

  const other = makeGroup({
    name: 'Asado',
    members: ['Ana', 'Beto'],
    expenses: [{ amount: 4000, payer: 'Ana', among: ['Ana', 'Beto'] }],
  });
  await page.goto(
    `/shared#${snapshotToken(other, '2026-11-24T13:42:00.000Z')}`
  );
  await page.getByRole('button', { name: 'Guardar en mi celular' }).click();
  await expect(page.getByText('Captura guardada en Mis grupos')).toBeVisible();

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('dividy') ?? '{}')
  );
  expect(stored.version).toBe(4);
  expect(stored.groups.map((g: { name: string }) => g.name)).toEqual(
    groups.map((g) => g.name)
  );
  expect(stored.snapshots).toHaveLength(1);

  await page.getByRole('link', { name: 'Dividy' }).click();
  await expect(page.getByRole('link', { name: /Viaje a Pucón/ })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Compartidos conmigo · solo lectura' })
  ).toBeVisible();
});
