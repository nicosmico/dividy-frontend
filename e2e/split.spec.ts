import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { computeBalances, formatAmount, type Group } from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';
import { openTab } from './navigation';
import { seedGroups } from './seed';
import { snapshotPath } from './snapshot-link';
import { chooseViewer, skipViewerSheet } from './viewer';

/**
 * División por montos, porcentajes o partes (ADR 0008), de punta a punta:
 * crear con error y corrección, saldos exactos, editar, compartir el link y
 * eliminar a un miembro en cascada.
 */

declare global {
  interface Window {
    __shared?: { title?: string; text?: string };
  }
}

const TAKEN = '2026-11-24T13:42:00.000Z';

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
  await skipViewerSheet(page);
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
}

type Mode = 'Iguales' | 'Montos' | '%' | 'Partes';

/** Opens "Nuevo gasto" with a description, an amount and a mode chosen. */
async function openForm(
  page: Page,
  options: { description: string; amount: number; payer?: string; mode: Mode }
) {
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill(options.description);
  await dialog.getByLabel('Monto').fill(String(options.amount));
  if (options.payer) {
    await dialog.getByLabel('Pagado por').click();
    await page.getByRole('option', { name: options.payer }).click();
  }
  await dialog.getByRole('radio', { name: options.mode, exact: true }).click();
  return dialog;
}

const statusLine = (dialog: Locator) => dialog.locator('p[aria-live="polite"]');

async function fill(dialog: Locator, label: string, value: string) {
  const field = dialog.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.blur();
}

/** The "Saldo por miembro" list. */
function memberBalances(page: Page) {
  return page
    .getByRole('heading', { name: 'Saldo por miembro' })
    .locator('xpath=ancestor::section[1]');
}

/** Checks every member's balance on screen against the one the domain computes. */
async function expectBalances(page: Page, group: Group) {
  const list = memberBalances(page);
  for (const b of computeBalances(group)) {
    const name = group.members.find((m) => m.id === b.memberId)!.name;
    const item = list.locator('li', { hasText: name }).first();
    const text =
      b.balance > 0
        ? `Le deben ${formatAmount(b.balance, 'CLP')}`
        : b.balance < 0
          ? `Debe ${formatAmount(-b.balance, 'CLP')}`
          : 'Al día';
    await expect(item).toContainText(text);
  }
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** The group the three expenses below build, computed by the domain. */
function expectedGroup(parts = { Ana: 2, Beto: 1, Carla: 1 }, amount = 30_001) {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 100_000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
        split: {
          type: 'exact',
          participantIds: ['Ana', 'Beto', 'Carla'],
          amounts: { Ana: 50_000, Beto: 30_000, Carla: 20_000 },
        },
      },
      {
        description: 'Cena',
        amount: 80_000,
        payer: 'Beto',
        among: ['Ana', 'Beto', 'Carla'],
        split: {
          type: 'percent',
          participantIds: ['Ana', 'Beto', 'Carla'],
          basisPoints: { Ana: 1250, Beto: 3750, Carla: 5000 },
        },
      },
      {
        description: 'Bencina',
        amount,
        payer: 'Carla',
        among: ['Ana', 'Beto', 'Carla'],
        split: {
          type: 'shares',
          participantIds: ['Ana', 'Beto', 'Carla'],
          parts,
        },
      },
    ],
  });
}

test('montos, porcentaje y partes: errores, saldos exactos, editar, link y abrirlo en otro celular', async ({
  page,
  browser,
}, testInfo) => {
  await stubShare(page);
  await createGroup(page, 'Cabaña de invierno', ['Ana', 'Beto', 'Carla']);

  // --- Montos: first it does not add up, then it does.
  const exact = await openForm(page, {
    description: 'Cabaña',
    amount: 100_000,
    mode: 'Montos',
  });
  // Pre-filled with today's equal parts, which already add up.
  await expect(exact.getByLabel('Monto de Ana')).toHaveValue('33.334');
  await expect(statusLine(exact)).toContainText(
    'Asignado $100.000 de $100.000 · Cuadra'
  );
  await fill(exact, 'Monto de Ana', '23334');
  await expect(exact.getByLabel('Monto de Ana')).toHaveValue('23.334');
  await expect(statusLine(exact)).toContainText(
    'Asignado $90.000 de $100.000 · faltan $10.000'
  );
  await exact.getByRole('button', { name: 'Guardar' }).click();
  await expect(exact.getByRole('alert')).toHaveText(
    'Faltan $10.000 por asignar.'
  );
  await fill(exact, 'Monto de Ana', '43334');
  await expect(statusLine(exact)).toContainText('te pasaste por $10.000');
  await expect(exact.getByRole('alert')).toHaveText('Te pasaste por $10.000.');
  await fill(exact, 'Monto de Ana', '50000');
  await fill(exact, 'Monto de Beto', '30000');
  await fill(exact, 'Monto de Carla', '20000');
  await expect(statusLine(exact)).toContainText('Cuadra');
  await expect(exact.getByRole('alert')).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await exact.getByRole('button', { name: 'Guardar' }).click();
  await expect(exact).toBeHidden();

  // --- Porcentaje, con coma.
  const percent = await openForm(page, {
    description: 'Cena',
    amount: 80_000,
    payer: 'Beto',
    mode: '%',
  });
  await expect(percent.getByLabel('Porcentaje de Ana')).toHaveValue('33,34');
  await fill(percent, 'Porcentaje de Ana', '12,5');
  await expect(statusLine(percent)).toContainText(
    'Suma 79,16 % · faltan 20,84 %'
  );
  await fill(percent, 'Porcentaje de Beto', '37,5');
  await fill(percent, 'Porcentaje de Carla', '50');
  await expect(statusLine(percent)).toContainText('100 %');
  await percent.getByRole('button', { name: 'Guardar' }).click();
  await expect(percent).toBeHidden();

  // --- Partes: the amount of each one is live.
  const parts = await openForm(page, {
    description: 'Bencina',
    amount: 30_001,
    payer: 'Carla',
    mode: 'Partes',
  });
  await fill(parts, 'Partes de Ana', '2');
  await expect(parts.getByText('2 partes · $15.001')).toBeVisible();
  await expect(parts.getByText('1 parte · $7.500')).toHaveCount(2);
  await expect(statusLine(parts)).toContainText('4 partes en total');
  await parts.getByRole('button', { name: 'Guardar' }).click();
  await expect(parts).toBeHidden();

  // --- The list says how each one is divided.
  await expect(page.getByRole('button', { name: /Cabaña/ })).toContainText(
    'Pagó Ana · dividido por montos'
  );
  await expect(page.getByRole('button', { name: /Cena/ })).toContainText(
    'Pagó Beto · dividido por porcentaje'
  );
  await expect(page.getByRole('button', { name: /Bencina/ })).toContainText(
    'Pagó Carla · dividido por partes'
  );

  // --- Saldos: the numbers the domain computes, to the peso.
  await openTab(page, 'Saldos');
  await expectBalances(page, expectedGroup());

  // --- Edit: the amount of a by-amounts expense stops adding up.
  await openTab(page, 'Gastos');
  await page.getByRole('button', { name: /Cabaña/ }).click();
  const edit = page.getByRole('dialog', { name: 'Editar gasto' });
  await expect(edit.getByRole('radio', { name: 'Montos' })).toBeChecked();
  await expect(edit.getByLabel('Monto de Ana')).toHaveValue('50.000');
  await edit.getByLabel('Monto').fill('120000');
  await expect(statusLine(edit)).toContainText('faltan $20.000');
  await edit.getByRole('button', { name: 'Guardar' }).click();
  await expect(edit.getByRole('alert')).toHaveText(
    'Faltan $20.000 por asignar.'
  );
  await fill(edit, 'Monto de Ana', '70000');
  await edit.getByRole('button', { name: 'Guardar' }).click();
  await expect(edit).toBeHidden();

  // ...and a by-parts expense recalculates by itself when its amount changes.
  await page.getByRole('button', { name: /Bencina/ }).click();
  const editParts = page.getByRole('dialog', { name: 'Editar gasto' });
  await editParts.getByLabel('Monto').fill('40000');
  await expect(editParts.getByText('2 partes · $20.000')).toBeVisible();
  await editParts.getByRole('button', { name: 'Guardar' }).click();
  await expect(editParts).toBeHidden();

  await openTab(page, 'Saldos');
  const edited = expectedGroup(undefined, 40_000);
  edited.expenses[0] = {
    ...edited.expenses[0],
    amount: 120_000,
    split: {
      type: 'exact',
      participantIds: ['Ana', 'Beto', 'Carla'],
      amounts: { Ana: 70_000, Beto: 30_000, Carla: 20_000 },
    },
  };
  await expectBalances(page, edited);

  // --- Share the link and open it in a brand new browser.
  await page.evaluate(() => {
    window.__shared = undefined;
  });
  await page.getByRole('button', { name: 'Compartir resumen' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__shared?.text))
    .toBeTruthy();
  const text = (await page.evaluate(() => window.__shared?.text)) as string;
  expect(text).toContain(
    '• Cabaña: $120.000, pagó Ana, por montos (Ana $70.000, Beto $30.000, Carla $20.000)'
  );
  expect(text).toContain(
    '• Cena: $80.000, pagó Beto, por porcentaje (Ana 12,5 %, Beto 37,5 %, Carla 50 %)'
  );
  expect(text).toContain(
    '• Bencina: $40.000, pagó Carla, por partes (Ana 2, Beto 1, Carla 1)'
  );
  const link = /Ver el detalle: (\S+)$/.exec(text)?.[1] as string;
  expect(link).toMatch(/\/shared#v3\./);

  const context = await freshContext(browser, testInfo);
  const other = await context.newPage();
  await other.goto(link);
  await skipViewerSheet(other);
  await expect(other.getByRole('button', { name: /Cabaña/ })).toHaveCount(0);
  await expect(other.getByText('Pagó Ana · dividido por montos')).toBeVisible();
  await expect(
    other.getByText('Pagó Beto · dividido por porcentaje')
  ).toBeVisible();
  await expect(
    other.getByText('Pagó Carla · dividido por partes')
  ).toBeVisible();
  await openTab(other, 'Saldos');
  await expectBalances(other, edited);
  await expectNoHorizontalScroll(other);
  await context.close();
});

test('el gráfico dice cómo se dividió un gasto por partes', async ({
  page,
}) => {
  await seedGroups(page, [expectedGroup()]);
  await page.goto('/groups/g1/balances');
  const name = 'Bencina: $30.001 · por partes: Ana 2, Beto 1, Carla 1';
  const segment = page.getByRole('button', { name }).first();
  await expect(segment).toBeVisible();
  await segment.click();
  const tip = page.getByRole('dialog', { name });
  await expect(tip).toBeVisible();
  const box = await tip.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  await expectNoHorizontalScroll(page);
});

test('los links v1 y v2 de antes siguen abriendo (en CLP) y los v3 llevan además la moneda', async ({
  page,
}) => {
  const group = expectedGroup();
  // v2 keeps the custom splits and has no currency: it opens as CLP.
  await page.goto(snapshotPath(group, TAKEN, 2));
  await skipViewerSheet(page);
  await expect(page.getByText('Pagó Ana · dividido por montos')).toBeVisible();
  await openTab(page, 'Saldos');
  await expectBalances(page, group);

  // v1 only knows equal parts: an equal group opens as it always did.
  const equal = {
    ...makeGroup({
      name: 'Viaje',
      members: ['Ana', 'Beto'],
      expenses: [
        {
          description: 'Pan',
          amount: 3001,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    }),
    id: 'otro-grupo',
  };
  await page.goto(snapshotPath(equal, TAKEN, 1));
  await chooseViewer(page, 'Beto');
  await expect(page.getByText('Pagó Ana · dividido entre todos')).toBeVisible();
  await openTab(page, 'Saldos');
  await expectBalances(page, equal);
});

test('eliminar a un miembro en cascada avisa cuántos gastos pasan a partes iguales', async ({
  page,
}) => {
  const group: Group = {
    ...expectedGroup(),
    id: 'g1',
    name: 'Cabaña de invierno',
  };
  group.expenses.push({
    id: 'e4',
    description: 'Pan',
    amount: 3000,
    payerId: 'Carla',
    split: { type: 'equal', participantIds: ['Ana', 'Beto'] },
    date: '2026-03-10',
    createdAt: '2026-03-10T12:00:00.000Z',
  });
  // Beto only paid "Cena" (it goes with him); "Cabaña" and "Bencina" are
  // custom and keep going without him; "Pan" is equal and is left as is.
  await seedGroups(page, [group]);
  await page.goto('/groups/g1/members');
  await page.getByRole('button', { name: 'Eliminar a Beto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Eliminar a Beto' });
  await dialog.getByText('Eliminar con sus gastos y pagos').click();
  await expect(
    dialog.getByText(
      '2 gastos con división personalizada pasarán a partes iguales.'
    )
  ).toBeVisible();
  await expect(dialog.getByText('Se borrará 1 gasto:')).toBeVisible();
  await dialog.getByRole('button', { name: 'Eliminar a Beto' }).click();
  await expect(dialog).toBeHidden();

  await openTab(page, 'Gastos');
  await expect(page.getByRole('button', { name: /Cabaña/ })).toContainText(
    'Pagó Ana · dividido entre todos'
  );
  await expect(page.getByRole('button', { name: /Bencina/ })).toContainText(
    'Pagó Carla · dividido entre todos'
  );
  await expect(page.getByRole('button', { name: /Cena/ })).toHaveCount(0);

  await openTab(page, 'Saldos');
  const after = makeGroup({
    members: ['Ana', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 100_000,
        payer: 'Ana',
        among: ['Ana', 'Carla'],
      },
      {
        description: 'Bencina',
        amount: 30_001,
        payer: 'Carla',
        among: ['Ana', 'Carla'],
      },
      { description: 'Pan', amount: 3000, payer: 'Carla', among: ['Ana'] },
    ],
  });
  await expectBalances(page, after);
});
