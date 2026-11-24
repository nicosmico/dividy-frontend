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

const BODY = '[data-slot="player-body"]';

const scrollTopOf = (dialog: Locator) =>
  dialog.locator(BODY).evaluate((body) => body.scrollTop);

/** `true` when the body has more content than it shows. */
const isScrollable = (dialog: Locator) =>
  dialog
    .locator(BODY)
    .evaluate((body) => body.scrollHeight > body.clientHeight + 4);

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

/** Inside the scrolling body: below the header and above the pinned footer. */
async function expectInBody(dialog: Locator, locator: Locator) {
  const box = await rect(locator);
  const body = await rect(dialog.locator(BODY));
  expect(box.y).toBeGreaterThanOrEqual(body.y - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(body.y + body.height + 1);
}

async function expectControlsVisible(page: Page, dialog: Locator) {
  const footer = dialog.locator('[data-slot="player-footer"]');
  await expectInViewport(page, footer);
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
    await expectControlsVisible(page, dialog);
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
    test(`en móvil el diálogo de ${name} es una página completa con la narración arriba y los controles a la vista, ${font}`, async ({
      page,
    }) => {
      const dialog = await openExplanation(page, group, dejavu);
      await page.waitForTimeout(700);

      // The dialog is the whole viewport.
      const box = await rect(dialog);
      expect(box.x).toBeCloseTo(0, 0);
      expect(box.y).toBeCloseTo(0, 0);
      expect(box.width).toBeCloseTo(390, 0);
      expect(box.height).toBeCloseTo(844, 0);

      // Fixed header: title, group name and a 44 px close button.
      const header = dialog.locator('[data-slot="page-dialog-header"]');
      await expect(header).toContainText('Cómo se calculó');
      await expect(header).toContainText(group.name);
      const close = dialog.getByRole('button', { name: 'Cerrar' });
      const closeBox = await rect(close);
      expect(closeBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBox.height).toBeGreaterThanOrEqual(44);

      // Opens at the top, with the narration above the first row.
      expect(await scrollTopOf(dialog)).toBe(0);
      const narration = dialog.locator('[aria-live="polite"]');
      const first = dialog.locator('[data-slot="paid-share-row"]').first();
      await expect(first).toContainText('Ana');
      const narrationBox = await rect(narration);
      const firstBox = await rect(first);
      expect(narrationBox.y + narrationBox.height).toBeLessThanOrEqual(
        firstBox.y + 1
      );
      await expectInBody(dialog, narration);
      await expectInBody(dialog, first);

      await walk(page, dialog, async (step) => {
        if (step === 0) {
          expect(await scrollTopOf(dialog)).toBe(0);
          await expect(dialog.locator('[data-slot="settling"]')).toHaveCount(0);
        }
        if (step === 3) {
          // Nothing scrolled down by itself: the user scrolls.
          expect(await scrollTopOf(dialog)).toBe(0);
          await expectInBody(dialog, dialog.locator('[aria-live="polite"]'));
          const pending = dialog.locator('[data-slot="pending-transfers"]');
          await expect(pending).toBeAttached();
          if (await isScrollable(dialog)) {
            await expect(
              dialog.locator('[data-slot="scroll-more"]')
            ).toBeVisible();
            // The user scrolls to the end by hand.
            await dialog
              .locator(BODY)
              .evaluate((body) => body.scrollTo(0, body.scrollHeight));
            await expectInBody(dialog, pending);
            await expect(
              dialog.locator('[data-slot="scroll-more"]')
            ).toBeHidden();
          } else {
            await expectInBody(dialog, pending);
          }
          await expect(
            dialog.locator('[data-slot="transfer"]').first()
          ).toBeAttached();
        }
      });
    });
  }
}

test('el botón ✕ cierra el diálogo y devuelve el foco a "Ver cómo se calculó"', async ({
  page,
}) => {
  const dialog = await openExplanation(page, fourGroup, false);
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Ver cómo se calculó' })
  ).toBeFocused();
});

test('si no falta nada, "¡Están al día!" se alcanza en el paso 4', async ({
  page,
}) => {
  const dialog = await openExplanation(page, settledGroup, false);
  await walk(page, dialog, async (step) => {
    if (step === 3) {
      const done = dialog.getByText('¡Están al día!', { exact: true });
      await done.scrollIntoViewIfNeeded();
      await expectInBody(dialog, done);
    }
  });
});

test('al cambiar de paso con los controles sube hasta el título y la narración', async ({
  page,
}) => {
  const dialog = await openExplanation(page, fiveGroup, false);
  const next = dialog.getByRole('button', { name: 'Paso siguiente' });
  await next.click();
  await next.click();
  await next.click();
  // The user reads the rows further down, then goes on with the controls.
  await dialog.locator(BODY).evaluate((body) => body.scrollTo(0, 9999));
  await page.waitForTimeout(200);
  await next.click();
  await page.waitForTimeout(900);
  const title = dialog.locator('section [id]').first();
  await expectInBody(dialog, title);
  await expectInBody(dialog, dialog.locator('[aria-live="polite"]'));
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

test('en escritorio el diálogo centrado tiene encabezado, cuerpo con scroll con la narración arriba y pie fijo', async ({
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
  const box = await rect(dialog);
  expect(box.width).toBeLessThan(600);
  expect(box.height).toBeLessThanOrEqual(800 - 32 + 1);
  expect(box.x).toBeGreaterThan(300);
  expect(await scrollTopOf(dialog)).toBe(0);
  const narration = await rect(dialog.locator('[aria-live="polite"]'));
  const first = await rect(
    dialog.locator('[data-slot="paid-share-row"]').first()
  );
  expect(narration.y + narration.height).toBeLessThanOrEqual(first.y + 1);
  await expectControlsVisible(page, dialog);
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  }
  await expectControlsVisible(page, dialog);
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
});
