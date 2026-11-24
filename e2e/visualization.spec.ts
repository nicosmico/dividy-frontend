import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { computeBalances, formatAmount, suggestTransfers } from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';
import { seedGroups } from './seed';

async function expectNoSeriousViolations(page: Page) {
  await expect(page.locator('span[role="img"]')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(
    violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({
        rule: v.id,
        nodes: v.nodes.map((n) => n.target.join(' ')),
      }))
  ).toEqual([]);
}

const people = ['Ana', 'Beto', 'Carla', 'Diego', 'Eli'];
const tripGroup = makeGroup({
  name: 'Viaje a Pucón',
  members: people,
  expenses: [
    {
      id: 'e1',
      description: 'Cabaña',
      amount: 150000,
      payer: 'Ana',
      among: people,
    },
    {
      id: 'e2',
      description: 'Supermercado',
      amount: 60000,
      payer: 'Beto',
      among: people,
    },
    {
      id: 'e3',
      description: 'Asado',
      amount: 50000,
      payer: 'Diego',
      among: people,
    },
    {
      id: 'e4',
      description: 'Bencina',
      amount: 40000,
      payer: 'Carla',
      among: ['Ana', 'Beto', 'Carla', 'Diego'],
    },
    {
      id: 'e5',
      description: 'Copete',
      amount: 30000,
      payer: 'Eli',
      among: ['Beto', 'Diego', 'Ana', 'Eli'],
    },
    {
      id: 'e6',
      description: 'Once',
      amount: 15000,
      payer: 'Ana',
      among: people,
    },
    {
      id: 'e7',
      description: 'Uber al terminal',
      amount: 12000,
      payer: 'Beto',
      among: ['Beto', 'Carla'],
    },
  ],
});
const manyExpenses = makeGroup({
  name: 'Viaje largo',
  members: people,
  expenses: Array.from({ length: 14 }, (_, i) => ({
    id: `x${i}`,
    description: `Gasto ${i + 1}`,
    amount: 150000 - i * 9000,
    payer: people[i % 5],
    among: people,
  })),
});
const hasNoHorizontalScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );

/** Clicks "Paso siguiente" `times` times, inside `scope`. */
async function clickNext(scope: Page | Locator, times: number) {
  for (let i = 0; i < times; i++) {
    await scope.getByRole('button', { name: 'Paso siguiente' }).click();
  }
}

test('sin grupos se ve la bienvenida animada, avanza con Siguiente y lleva a crear grupo', async ({
  page,
}) => {
  await page.goto('/');
  const example = page.getByRole('region', { name: /Ejemplo animado/ });
  await expect(example).toBeVisible();
  await expect(example).toHaveAttribute('data-step', '0');
  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(example.locator('[data-mood="sad"]')).toHaveCount(3);
  // The same horizontal rows as the Saldos chart, one per member.
  await expect(example.locator('[data-slot="paid-share-row"]')).toHaveCount(3);

  const live = example.locator('[aria-live="polite"]');
  const next = page.getByRole('button', { name: 'Paso siguiente' });

  // Step 2 goes through the 3 expenses one by one.
  await next.click();
  await expect(example).toHaveAttribute('data-step', '1');
  await expect(example.getByText('2 · Se calcula su parte')).toBeVisible();
  await expect(example).toContainText('Gasto 1 de 3');
  await expect(live).toContainText(
    'Beto pagó Alojamiento ($45.000). Se divide entre 3: $15.000 cada uno.'
  );
  // Alojamiento is split among 3: its "Gastó" segment gets 2 cuts.
  await expect(example.locator('[data-slot="cut"]')).toHaveCount(2);
  await next.click();
  await expect(example).toContainText('Gasto 2 de 3');
  await expect(live).toContainText('Ana pagó Carne ($30.000)');
  await next.click();
  await expect(example).toContainText('Gasto 3 de 3');
  await expect(live).toContainText(
    'Carla pagó Bebidas ($15.000). Se divide entre 2: $7.500 cada uno.'
  );

  for (const [step, title] of [
    [2, '3 · Se compara'],
    [3, '4 · Se salda'],
  ] as const) {
    await next.click();
    await expect(example).toHaveAttribute('data-step', String(step));
    await expect(example.getByText(title)).toBeVisible();
  }
  await expect(example.locator('[data-mood="happy"]')).toHaveCount(3);
  await expect(example.getByText('$12.500').last()).toBeVisible();
  await expect(example.getByText('Al día', { exact: true })).toHaveCount(3);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  await page.getByRole('link', { name: 'Crear mi primer grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/new$/);
});

test('la bienvenida no desborda ni cambia de alto entre pasos a 360 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const example = page.getByRole('region', { name: /Ejemplo animado/ });
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.waitForTimeout(300);
  const heights = new Set<number>();
  for (let i = 0; i < 6; i++) {
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    heights.add(Math.round((await example.boundingBox())!.height));
    await clickNext(page, 1);
  }
  expect([...heights]).toHaveLength(1);
});

test('el gráfico de Saldos muestra los montos que calcula el dominio', async ({
  page,
}) => {
  await seedGroups(page, [tripGroup]);
  await page.goto('/groups/g1/balances');
  const chart = page
    .getByRole('heading', { name: 'Gastó vs. su parte' })
    .locator('xpath=ancestor::section[1]');
  await expect(chart).toBeVisible();

  const balances = computeBalances(tripGroup);
  const rows = chart.locator('ul').first().locator('> li');
  await expect(rows).toHaveCount(5);
  for (const [i, b] of balances.entries()) {
    await expect(rows.nth(i)).toContainText(tripGroup.members[i].name);
    await expect(rows.nth(i)).toContainText(formatAmount(b.paid, 'CLP'));
    await expect(rows.nth(i)).toContainText(formatAmount(b.share, 'CLP'));
    const word = b.balance > 0 ? 'Le deben' : b.balance < 0 ? 'Debe' : 'Al día';
    await expect(rows.nth(i)).toContainText(word);
  }
  const cabana = chart.getByRole('button', {
    name: 'Cabaña: $150.000 · entre 5: $30.000 c/u',
  });
  await expect(cabana).toHaveCount(1);
  // "Gastó" cuts each expense into one part per participant (5 -> 4 cuts);
  // "Su parte" has none. The cuts are decorative.
  await expect(cabana.locator('[data-slot="cut"]')).toHaveCount(4);
  await expect(cabana.locator('[data-slot="cuts"]')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
  await expect(
    rows.nth(0).locator('[data-slot="bar"]').nth(1).locator('[data-slot="cut"]')
  ).toHaveCount(0);
  const legend = chart.getByRole('list', { name: 'Leyenda de gastos' });
  await expect(legend.locator('li')).toHaveCount(7);
  await expect(legend).toContainText('Uber al terminal');

  // Keyboard: focus a segment, see its tooltip.
  await cabana.focus();
  await expect(
    page.getByRole('dialog', {
      name: 'Cabaña: $150.000 · entre 5: $30.000 c/u',
    })
  ).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('con 14 gastos hay rayas y "Otros" sin scroll horizontal', async ({
  page,
}) => {
  await seedGroups(page, [manyExpenses]);
  await page.goto('/groups/g1/balances');
  const legend = page.getByRole('list', { name: 'Leyenda de gastos' });
  await expect(legend.locator('li')).toHaveCount(13);
  await expect(legend.locator('li').last()).toContainText('Otros (2 gastos)');
  await expect(
    legend
      .locator('li')
      .nth(7)
      .locator('span[style*="repeating-linear-gradient"]')
  ).toHaveCount(1);
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('"Ver cómo se calculó" abre la animación con los datos del grupo y navega', async ({
  page,
}) => {
  await seedGroups(page, [tripGroup]);
  await page.goto('/groups/g1/balances');
  await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cómo se calculó' });
  await expect(dialog.getByText('1 · Cada uno paga')).toBeVisible();
  await dialog.getByRole('button', { name: 'Pausar' }).click();
  await expect(dialog.locator('[data-slot="paid-share-row"]')).toHaveCount(5);
  // 7 expenses: the 6 biggest one by one and a last sub-step with the other.
  await clickNext(dialog, 1);
  await expect(dialog).toContainText('Gasto 1 de 7');
  await clickNext(dialog, 6);
  await expect(dialog).toContainText('El otro gasto');
  await expect(dialog.locator('[aria-live="polite"]')).toContainText(
    'El otro gasto ($12.000) se divide igual'
  );
  await clickNext(dialog, 2);
  await expect(dialog.getByText('4 · Se salda')).toBeVisible();
  const transfers = suggestTransfers(tripGroup);
  await expect(dialog.locator('[data-slot="transfer"]')).toHaveCount(
    transfers.length
  );
  await expect(dialog.locator('[data-slot="transfer"]').first()).toContainText(
    formatAmount(transfers[0].amount, 'CLP')
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe de la visualización, modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('bienvenida en sus cuatro pasos', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Pausar' }).click();
      // 6 positions: step 1, the 3 sub-steps of step 2, steps 3 and 4.
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(900);
        await expectNoSeriousViolations(page);
        await page.getByRole('button', { name: 'Paso siguiente' }).click();
      }
    });

    test('Saldos con el gráfico, el tooltip, la tabla y el diálogo', async ({
      page,
    }) => {
      await seedGroups(page, [manyExpenses]);
      await page.goto('/groups/g1/balances');
      await expect(
        page.getByRole('heading', { name: 'Gastó vs. su parte' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('button', { name: /^Gasto 1: / })
        .first()
        .focus();
      await expect(
        page.getByRole('dialog', { name: /^Gasto 1: / })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.getByText('Ver como tabla').click();
      await expectNoSeriousViolations(page);

      await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
      const dialog = page.getByRole('dialog', { name: 'Cómo se calculó' });
      await dialog.getByRole('button', { name: 'Pausar' }).click();
      await page.waitForTimeout(900);
      await expectNoSeriousViolations(page);
      // A sub-step of step 2, with a segment cut into pieces.
      await clickNext(dialog, 2);
      await page.waitForTimeout(900);
      await expectNoSeriousViolations(page);
      // Last position: step 4.
      await clickNext(dialog, 7);
      await expect(dialog.getByText('4 · Se salda')).toBeVisible();
      await page.waitForTimeout(900);
      await expectNoSeriousViolations(page);
    });
  });
}
