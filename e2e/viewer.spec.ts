import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { expectNoSeriousViolations } from './axe';
import { openTab } from './navigation';
import { sampleGroups, seedGroups } from './seed';
import { snapshotPath } from './snapshot-link';
import { chooseViewer, seedViewers, skipViewerSheet } from './viewer';

declare global {
  interface Window {
    __shared?: { title?: string; text?: string };
  }
}

const sheetOf = (page: Page) =>
  page.getByRole('dialog', { name: '¿Quién eres?' });

async function createGroup(page: Page, name: string, members: string[]) {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill(name);
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const member of members) {
    await memberInput.fill(member);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
}

async function addExpense(
  page: Page,
  expense: { description: string; amount: number; payer?: string }
) {
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill(expense.description);
  await dialog
    .getByLabel('Monto', { exact: true })
    .fill(String(expense.amount));
  if (expense.payer) {
    await dialog.getByLabel('Pagado por').click();
    await page.getByRole('option', { name: expense.payer }).click();
  }
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
}

const headline = (page: Page) => page.locator('#status-heading');

/** A new browser context without any data, shaped like the project. */
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

test('crear grupo pregunta quién eres, personaliza Saldos, se recuerda al recargar y se cambia con "Soy yo"', async ({
  page,
}) => {
  await createGroup(page, 'Viaje a Pucón', ['Ana', 'Beto', 'Carla']);

  // Right after "Crear grupo" the sheet is there, with the faces in group order.
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^Soy / })).toHaveText([
    'Ana',
    'Beto',
    'Carla',
  ]);
  await chooseViewer(page, 'Beto');
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);

  await addExpense(page, { description: 'Asado', amount: 12000, payer: 'Ana' });
  await openTab(page, 'Saldos');
  await expect(headline(page)).toHaveText('Debes $4.000');
  await expect(page.getByText('Transfiérele a Ana')).toBeVisible();
  // Your transfer first, with "(tú)".
  const transfers = page
    .getByRole('heading', { name: 'Para quedar al día' })
    .locator('xpath=ancestor::section[1]')
    .getByRole('listitem');
  await expect(transfers.first()).toContainText('Beto (tú) → Ana');
  await expect(
    page.locator('[data-slot="paid-share-row"]').first()
  ).toContainText('Beto (tú)');

  // It is remembered: no sheet after a reload.
  await page.reload();
  await expect(headline(page)).toHaveText('Debes $4.000');
  await expect(sheet).toHaveCount(0);

  // Change it from Miembros ("Soy yo" is saved with "Guardar").
  await openTab(page, 'Miembros');
  await expect(page.getByText('Beto (tú)')).toBeVisible();
  await page.getByRole('button', { name: 'Editar a Ana' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar miembro' });
  await dialog.getByRole('switch', { name: 'Soy yo' }).click();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Beto (tú)')).toBeVisible();

  await page.getByRole('button', { name: 'Editar a Ana' }).click();
  await dialog.getByRole('switch', { name: 'Soy yo' }).click();
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Ana (tú)')).toBeVisible();
  await expect(page.getByText('Beto (tú)')).toHaveCount(0);
  await openTab(page, 'Saldos');
  await expect(headline(page)).toHaveText('Te deben $8.000');
});

test('un grupo existente sin elección pregunta una sola vez; "No soy parte" deja el titular normal', async ({
  page,
}) => {
  await seedGroups(page, sampleGroups(), { askViewer: true });
  await page.goto('/groups/g1/balances');
  await expect(sheetOf(page)).toBeVisible();
  await skipViewerSheet(page);
  await expect(headline(page)).toContainText('Pendiente:');

  await page.reload();
  await expect(headline(page)).toContainText('Pendiente:');
  await expect(sheetOf(page)).toHaveCount(0);
  await expect(page.getByText('(tú)', { exact: false })).toHaveCount(0);
});

test('cerrar la hoja sin elegir no guarda nada y vuelve a preguntar la próxima vez', async ({
  page,
}) => {
  await seedGroups(page, sampleGroups(), { askViewer: true });
  await page.goto('/groups/g1/balances');
  await expect(sheetOf(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheetOf(page)).toBeHidden();
  await expect(headline(page)).toContainText('Pendiente:');
  await page.reload();
  await expect(sheetOf(page)).toBeVisible();
});

test('abrir una captura por link en un contexto nuevo: hoja, "Viendo como…", cambiar y resumen igual', async ({
  browser,
}, testInfo) => {
  const [trip] = sampleGroups();
  const link = snapshotPath(trip, '2026-11-24T13:42:00.000Z');
  const context = await freshContext(browser, testInfo);
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: { title?: string; text?: string }) => {
          window.__shared = data;
        },
      });
    });
    await page.goto(link);
    const sheet = sheetOf(page);
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Solo estoy mirando' })
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'No soy parte de este grupo' })
    ).toHaveCount(0);

    const shared = async () => {
      await page.evaluate(() => {
        window.__shared = undefined;
      });
      await page.getByRole('button', { name: 'Compartir resumen' }).click();
      await expect
        .poll(() => page.evaluate(() => window.__shared?.text))
        .toBeTruthy();
      return page.evaluate(() => window.__shared?.text);
    };

    await skipViewerSheet(page);
    await expect(page.getByText('Solo estás mirando')).toBeVisible();
    await openTab(page, 'Saldos');
    await expect(headline(page)).toContainText('Pendiente:');
    const summaryNoViewer = await shared();

    await page.getByRole('button', { name: 'Elegir quién eres' }).click();
    await chooseViewer(page, 'Beto');
    await expect(page.getByText('Viendo como Beto')).toBeVisible();
    await expect(headline(page)).toContainText('Debes');
    // The summary is for the group: it does not change.
    expect(await shared()).toBe(summaryNoViewer);

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await chooseViewer(page, 'Ana');
    await expect(page.getByText('Viendo como Ana')).toBeVisible();
    await expect(headline(page)).toContainText('Te deben');

    // Remembered after a reload of the same link.
    await page.reload();
    await expect(page.getByText('Viendo como Ana')).toBeVisible();
    await expect(sheetOf(page)).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('la hoja no se abre en un link inválido ni en la bienvenida', async ({
  page,
}) => {
  await page.goto('/shared#v1.esto-no-es-una-captura');
  await expect(
    page.getByRole('heading', { name: 'Este link no se pudo abrir' })
  ).toBeVisible();
  await expect(sheetOf(page)).toHaveCount(0);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toBeVisible();
  await expect(sheetOf(page)).toHaveCount(0);
});

test('un miembro elegido y eliminado: se vuelve a preguntar', async ({
  page,
}) => {
  const [trip] = sampleGroups();
  await seedGroups(page, [trip], { askViewer: true });
  await seedViewers(page, { 'group:g1': { memberId: 'Beto' } });
  await page.goto('/groups/g1/members');
  await expect(page.getByText('Beto (tú)')).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar a Beto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Eliminar a Beto' });
  await dialog.getByRole('button', { name: 'Eliminar a Beto' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Ana (tú)')).toHaveCount(0);
  await page.reload();
  await expect(sheetOf(page)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad de "¿Quién eres?", modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('la hoja abierta no tiene violaciones serious ni critical', async ({
      page,
    }) => {
      await seedGroups(page, sampleGroups(), { askViewer: true });
      await page.goto('/groups/g1/balances');
      await expect(sheetOf(page)).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('la hoja de una captura, y Saldos con "Viendo como…"', async ({
      page,
    }) => {
      const [trip] = sampleGroups();
      await page.goto(snapshotPath(trip, '2026-11-24T13:42:00.000Z'));
      await expect(sheetOf(page)).toBeVisible();
      await expectNoSeriousViolations(page);
      await chooseViewer(page, 'Beto');
      await openTab(page, 'Saldos');
      await expect(page.getByText('Viendo como Beto')).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Miembros con "(tú)" y el diálogo con "Soy yo"', async ({ page }) => {
      await seedGroups(page, sampleGroups(), { askViewer: true });
      await seedViewers(page, { 'group:g1': { memberId: 'Ana' } });
      await page.goto('/groups/g1/members');
      await expect(page.getByText('Ana (tú)')).toBeVisible();
      await expectNoSeriousViolations(page);
      await page.getByRole('button', { name: 'Editar a Ana' }).click();
      await expect(page.getByRole('switch', { name: 'Soy yo' })).toBeChecked();
      await expectNoSeriousViolations(page);
    });
  });
}
