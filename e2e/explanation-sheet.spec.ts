import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import type { Group } from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';
import { seedGroups } from './seed';

const four = ['Ana', 'Beto', 'Carla', 'Diego'];
const five = [...four, 'Eli'];

const fourGroup = makeGroup({
  name: 'Cuatro amigos',
  members: four,
  expenses: [
    {
      id: 'e1',
      description: 'Cabaña',
      amount: 120000,
      payer: 'Ana',
      among: four,
    },
    {
      id: 'e2',
      description: 'Supermercado',
      amount: 48000,
      payer: 'Beto',
      among: four,
    },
    {
      id: 'e3',
      description: 'Bencina',
      amount: 30000,
      payer: 'Carla',
      among: ['Ana', 'Carla', 'Diego'],
    },
  ],
});
const fiveGroup = makeGroup({
  name: 'Cinco con pagos',
  members: five,
  expenses: [
    {
      id: 'e1',
      description: 'Cabaña',
      amount: 150000,
      payer: 'Ana',
      among: five,
    },
    {
      id: 'e2',
      description: 'Supermercado',
      amount: 60000,
      payer: 'Beto',
      among: five,
    },
    {
      id: 'e3',
      description: 'Asado',
      amount: 50000,
      payer: 'Diego',
      among: five,
    },
    {
      id: 'e4',
      description: 'Bencina',
      amount: 40000,
      payer: 'Carla',
      among: four,
    },
  ],
  payments: [
    { id: 'p1', from: 'Eli', to: 'Ana', amount: 10000 },
    { id: 'p2', from: 'Carla', to: 'Ana', amount: 5000 },
  ],
});
const settledGroup = makeGroup({
  name: 'Al día',
  members: four,
  expenses: [
    { id: 'e1', description: 'Cena', amount: 40000, payer: 'Ana', among: four },
  ],
  payments: [
    { id: 'p1', from: 'Beto', to: 'Ana', amount: 10000 },
    { id: 'p2', from: 'Carla', to: 'Ana', amount: 10000 },
    { id: 'p3', from: 'Diego', to: 'Ana', amount: 10000 },
  ],
});

const DEJAVU = '* { font-family: "DejaVu Sans", sans-serif !important; }';

async function openExplanation(page: Page, group: Group, dejavu: boolean) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedGroups(page, [group]);
  await page.goto('/groups/g1/balances');
  if (dejavu) await page.addStyleTag({ content: DEJAVU });
  await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cómo se calculó' });
  await expect(dialog.getByText('1 · Cada uno paga')).toBeVisible();
  await dialog.getByRole('button', { name: 'Pausar' }).click();
  return dialog;
}

/** The element that scrolls the dialog's body (sheet or centered dialog). */
const scrollTopOf = (dialog: Locator) =>
  dialog.locator('section').evaluate((section) => {
    for (let n = section.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if (o === 'auto' || o === 'scroll') return n.scrollTop;
    }
    return -1;
  });

async function rect(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/** Fully inside the viewport. */
async function expectInViewport(page: Page, locator: Locator) {
  const box = await rect(locator);
  const { width, height } = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
}

/** Inside the scrolling body: below its top and above the pinned footer. */
async function expectInBody(dialog: Locator, locator: Locator) {
  const box = await rect(locator);
  const footer = await rect(dialog.locator('[data-slot="player-footer"]'));
  const header = await rect(
    dialog.locator('[data-slot="drawer-header"], [data-slot="dialog-header"]')
  );
  expect(box.y + box.height).toBeLessThanOrEqual(footer.y + 1);
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
}

async function expectFooterVisible(page: Page, dialog: Locator) {
  await expectInViewport(page, dialog.locator('[aria-live="polite"]'));
  for (const name of [
    'Paso anterior',
    'Pausar',
    'Reproducir',
    'Paso siguiente',
  ]) {
    const button = dialog.getByRole('button', { name });
    if (await button.count()) await expectInViewport(page, button);
  }
}

async function walk(
  page: Page,
  dialog: Locator,
  onFrame: (step: number) => Promise<void>
) {
  for (let i = 0; i < 14; i++) {
    const step = Number(
      await dialog.locator('section').getAttribute('data-step')
    );
    await page.waitForTimeout(700);
    await expectFooterVisible(page, dialog);
    await onFrame(step);
    if (step === 3) return;
    await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  }
  throw new Error('step 4 was never reached');
}

for (const dejavu of [false, true]) {
  const font = dejavu ? 'con DejaVu Sans' : 'con la fuente de la app';
  for (const [name, group] of [
    ['4 personas', fourGroup],
    ['5 personas con pagos', fiveGroup],
  ] as const) {
    test(`el diálogo de ${name} abre arriba y deja narración y controles a la vista, ${font}`, async ({
      page,
    }) => {
      const dialog = await openExplanation(page, group, dejavu);
      await page.waitForTimeout(700);
      expect(await scrollTopOf(dialog)).toBe(0);
      const first = dialog.locator('[data-slot="paid-share-row"]').first();
      await expect(first).toContainText('Ana');
      await expectInBody(dialog, first);
      await expectInViewport(page, first);

      await walk(page, dialog, async (step) => {
        if (step === 0) {
          expect(await scrollTopOf(dialog)).toBe(0);
          await expect(dialog.locator('[data-slot="settling"]')).toHaveCount(0);
        }
        if (step === 3) {
          const pending = dialog.locator('[data-slot="pending-transfers"]');
          await expect(pending).toBeVisible();
          await expectInBody(dialog, pending);
          await expectInViewport(page, pending);
          await expect(
            dialog.locator('[data-slot="transfer"]').first()
          ).toBeVisible();
        }
      });
    });
  }
}

test('si no falta nada, "¡Están al día!" queda a la vista en el paso 4', async ({
  page,
}) => {
  const dialog = await openExplanation(page, settledGroup, false);
  await walk(page, dialog, async (step) => {
    if (step === 3) {
      const done = dialog.getByText('¡Están al día!', { exact: true });
      await expectInBody(dialog, done);
      await expectInViewport(page, done);
    }
  });
});

test('en el paso 2 se acerca la fila de quien pagó y de los participantes', async ({
  page,
}) => {
  const dialog = await openExplanation(page, fiveGroup, false);
  await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  // Sub-step 3 is "Asado", paid by Diego (fourth row), among all.
  await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  await page.waitForTimeout(900);
  const payer = dialog
    .locator('[data-slot="paid-share-row"]')
    .filter({ hasText: 'Diego' });
  await expectInBody(dialog, payer);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe del diálogo de cuatro y cinco personas, modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    for (const [name, group] of [
      ['4', fourGroup],
      ['5', fiveGroup],
    ] as const) {
      test(`${name} personas en los pasos 1, 2 y 4`, async ({ page }) => {
        const dialog = await openExplanation(page, group, false);
        const check = async () => {
          await page.waitForTimeout(900);
          const { violations } = await new AxeBuilder({ page })
            .withTags([
              'wcag2a',
              'wcag2aa',
              'wcag21a',
              'wcag21aa',
              'best-practice',
            ])
            .analyze();
          expect(
            violations
              .filter((v) => v.impact === 'serious' || v.impact === 'critical')
              .map((v) => v.id)
          ).toEqual([]);
        };
        await check();
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
        await check();
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
        await check();
      });
    }
  });
}

test('en escritorio el diálogo centrado tiene cuerpo con scroll y pie fijo', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'solo escritorio');
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedGroups(page, [fiveGroup]);
  await page.goto('/groups/g1/balances');
  await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cómo se calculó' });
  await dialog.getByRole('button', { name: 'Pausar' }).click();
  await page.waitForTimeout(700);
  expect(await scrollTopOf(dialog)).toBe(0);
  await expectInViewport(page, dialog.locator('[aria-live="polite"]'));
  await expectInViewport(
    page,
    dialog.locator('[data-slot="paid-share-row"]').first()
  );
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  }
});
