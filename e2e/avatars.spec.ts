import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { makeGroup } from '../src/domain/test-utils/fixtures';
import { openTab } from './navigation';
import { seedDocument, seedGroups } from './seed';

const NAMES = [
  'Ana',
  'Beto',
  'Carla',
  'Diego',
  'Eli',
  'Fran',
  'Gabo',
  'Hugo',
  'Inés',
];

const nineMembers = makeGroup({ name: 'Cumpleaños', members: NAMES });

/** `data-avatar-color` of each avatar in the member list, in order. */
async function listColors(page: Page): Promise<string[]> {
  return page
    .getByRole('main')
    .locator(
      'ul li button[aria-label^="Cambiar avatar de"] [data-avatar-color]'
    )
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-avatar-color') ?? '')
    );
}

async function storedMembers(page: Page) {
  return page.evaluate(() => {
    const doc = JSON.parse(window.localStorage.getItem('dividy') ?? '{}');
    return {
      version: doc.version as number,
      members: doc.groups[0].members as {
        id: string;
        avatar: { color: number; seed: string };
      }[],
    };
  });
}

test('un grupo de 9 miembros: los 8 primeros tienen colores distintos', async ({
  page,
}) => {
  await seedGroups(page, [nineMembers]);
  await page.goto('/groups/g1/members');
  await expect(page.getByText('9 miembros')).toBeVisible();
  await expect
    .poll(async () => (await listColors(page)).length)
    .toBe(NAMES.length);
  const colors = await listColors(page);
  expect(new Set(colors.slice(0, 8)).size).toBe(8);
  // From the 9th on the palette starts over, in order.
  expect(colors[8]).toBe(colors[0]);
});

test('tocar la carita da otra cara con el mismo color y se puede deshacer', async ({
  page,
}) => {
  await seedGroups(page, [nineMembers]);
  await page.goto('/groups/g1/members');
  const before = (await storedMembers(page)).members;
  const button = page.getByRole('button', { name: 'Cambiar avatar de Beto' });
  const box = await button.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);

  const faceBefore = await button.locator('img').getAttribute('src');
  await button.click();
  await expect(page.getByText('Cara nueva para Beto')).toBeVisible();
  await expect
    .poll(async () => (await storedMembers(page)).members[1].avatar.seed)
    .not.toBe('Beto');
  const changed = (await storedMembers(page)).members;
  expect(changed[1].avatar.color).toBe(before[1].avatar.color);
  expect(changed[0].avatar).toEqual(before[0].avatar);
  await expect(button.locator('img')).not.toHaveAttribute(
    'src',
    faceBefore ?? ''
  );

  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Cambio deshecho')).toBeVisible();
  await expect
    .poll(async () => (await storedMembers(page)).members[1].avatar)
    .toEqual(before[1].avatar);
});

test('en el diálogo la cara nueva es una vista previa: Cancelar la descarta y Guardar la mantiene tras recargar', async ({
  page,
}) => {
  await seedGroups(page, [nineMembers]);
  await page.goto('/groups/g1/members');
  const original = (await storedMembers(page)).members[0].avatar;

  const open = async () => {
    await page.getByRole('button', { name: 'Editar a Ana' }).click();
    return page.getByRole('dialog', { name: 'Editar miembro' });
  };

  let dialog = await open();
  await dialog.getByRole('button', { name: 'Generar otra cara' }).click();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect((await storedMembers(page)).members[0].avatar).toEqual(original);

  dialog = await open();
  await dialog.getByRole('button', { name: 'Generar otra cara' }).click();
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  const saved = (await storedMembers(page)).members[0].avatar;
  expect(saved.color).toBe(original.color);
  expect(saved.seed).not.toBe(original.seed);

  await page.reload();
  await expect(page.getByText('9 miembros')).toBeVisible();
  expect((await storedMembers(page)).members[0].avatar).toEqual(saved);
});

test('Crear grupo: tocar la carita da otra cara antes de crear', async ({
  page,
}) => {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill('Asado');
  const input = page.getByRole('textbox', { name: 'Miembros' });
  await input.fill('Ana');
  await input.press('Enter');
  await input.fill('Beto');
  await input.press('Enter');
  const button = page.getByRole('button', { name: 'Cambiar avatar de Ana' });
  await expect(button.locator('img')).toBeVisible();
  const before = await button.locator('img').getAttribute('src');
  await button.click();
  await expect(button.locator('img')).not.toHaveAttribute('src', before ?? '');
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  const { members } = await storedMembers(page);
  expect(members.map((m) => m.avatar.color)).toEqual([0, 1]);
  expect(members[0].avatar.seed).not.toBe(members[0].id);
  expect(members[1].avatar.seed).toBe(members[1].id);
});

test('migra un documento v2 sembrado: misma cara (semilla = id) y colores en orden', async ({
  page,
}) => {
  const v2Members = ['m1', 'm2', 'm3'].map((id, i) => ({
    id,
    name: ['Ana', 'Beto', 'Cami'][i],
  }));
  await seedDocument(page, {
    version: 2,
    groups: [
      {
        id: 'g1',
        name: 'Viejo',
        currency: 'CLP',
        members: v2Members,
        expenses: [
          {
            id: 'e1',
            description: 'Pizza',
            amount: 9000,
            payerId: 'm1',
            split: { type: 'equal', participantIds: ['m1', 'm2', 'm3'] },
            date: '2026-03-10',
            createdAt: '2026-03-10T10:00:00.000Z',
          },
        ],
        payments: [],
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
    ],
  });
  await page.goto('/groups/g1/members');
  await expect(page.getByText('3 miembros')).toBeVisible();
  await expect.poll(async () => (await listColors(page)).length).toBe(3);
  expect(await listColors(page)).toEqual(['0', '1', '2']);

  // The first change saves the migrated document (v3) without losing data.
  await page.getByRole('button', { name: 'Cambiar avatar de Cami' }).click();
  await expect(page.getByText('Cara nueva para Cami')).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('dividy') ?? '{}')
  );
  expect(stored.version).toBe(3);
  expect(stored.groups[0].expenses).toHaveLength(1);
  expect(
    stored.groups[0].members.map(
      (m: { id: string; avatar: { seed: string } }) => [m.id, m.avatar.seed]
    )
  ).toEqual([
    ['m1', 'm1'],
    ['m2', 'm2'],
    ['m3', expect.not.stringMatching(/^m3$/)],
  ]);
});

test('Saldos: los cortes se ven en "Gastó" y no en "Su parte"', async ({
  page,
}) => {
  await seedGroups(page, [
    makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        {
          id: 'e1',
          description: 'Cabaña',
          amount: 30000,
          payer: 'Ana',
          among: ['Ana', 'Beto', 'Carla'],
        },
      ],
    }),
  ]);
  await page.goto('/groups/g1/expenses');
  await openTab(page, 'Saldos');
  const row = page.locator('[data-slot="paid-share-row"]').first();
  const [paid, share] = [
    row.locator('[data-slot="bar"]').first(),
    row.locator('[data-slot="bar"]').nth(1),
  ];
  await expect(paid.locator('[data-slot="cut"]')).toHaveCount(2);
  await expect(share.locator('[data-slot="cut"]')).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe de avatares y cortes, modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('Miembros, diálogo de edición, Crear grupo y Saldos', async ({
      page,
    }) => {
      const expectClean = async () => {
        await expect(page.locator('span[role="img"]')).toHaveCount(0);
        await page.waitForFunction(() =>
          document
            .getAnimations()
            .every(
              (a) =>
                a.playState !== 'running' ||
                a.effect?.getTiming().iterations === Infinity
            )
        );
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
            .map((v) => ({
              rule: v.id,
              nodes: v.nodes.map((n) => n.target.join(' ')),
            }))
        ).toEqual([]);
      };
      await seedGroups(page, [
        makeGroup({
          name: 'Cumpleaños',
          members: NAMES,
          expenses: [
            {
              id: 'e1',
              description: 'Torta',
              amount: 27000,
              payer: 'Ana',
              among: NAMES,
            },
          ],
        }),
      ]);
      await page.goto('/groups/g1/members');
      await expect(page.getByText('9 miembros')).toBeVisible();
      await expectClean();

      await page.getByRole('button', { name: 'Editar a Ana' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Editar miembro' })
      ).toBeVisible();
      await expectClean();
      await page.keyboard.press('Escape');

      await openTab(page, 'Saldos');
      await expect(
        page.getByRole('heading', { name: 'Gastó vs. su parte' })
      ).toBeVisible();
      await expectClean();

      await page.goto('/groups/new');
      await page.getByRole('textbox', { name: 'Miembros' }).fill('Ana');
      await page.getByRole('textbox', { name: 'Miembros' }).press('Enter');
      await expect(
        page.getByRole('button', { name: 'Cambiar avatar de Ana' })
      ).toBeVisible();
      await expectClean();
    });
  });
}
