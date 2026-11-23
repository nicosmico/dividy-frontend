import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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

test('sin grupos se ve la bienvenida animada, avanza con Siguiente y lleva a crear grupo', async ({
  page,
}) => {
  await page.goto('/');
  const example = page.getByRole('region', { name: /Ejemplo animado/ });
  await expect(example).toBeVisible();
  await expect(example).toHaveAttribute('data-step', '0');
  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(example.locator('[data-mood="sad"]')).toHaveCount(3);

  const next = page.getByRole('button', { name: 'Paso siguiente' });
  for (const [step, title] of [
    [1, '2 · Se calcula su parte'],
    [2, '3 · Se compara'],
    [3, '4 · Se salda'],
  ] as const) {
    await next.click();
    await expect(example).toHaveAttribute('data-step', String(step));
    await expect(example.getByText(title)).toBeVisible();
  }
  await expect(example.locator('[data-mood="happy"]')).toHaveCount(3);
  await expect(example.getByText('$12.500').last()).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  await page.getByRole('link', { name: 'Crear mi primer grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/new$/);
});

test('el gráfico de Saldos muestra los montos que calcula el dominio', async ({
  page,
}) => {
  await seedGroups(page, [tripGroup]);
  await page.goto('/groups/g1/balances');
  const chart = page
    .getByRole('heading', { name: 'Pagó vs. su parte' })
    .locator('xpath=ancestor::section[1]');
  await expect(chart).toBeVisible();

  const balances = computeBalances(tripGroup);
  const rows = chart.locator('ul').first().locator('> li');
  await expect(rows).toHaveCount(5);
  for (const [i, b] of balances.entries()) {
    await expect(rows.nth(i)).toContainText(tripGroup.members[i].name);
    await expect(rows.nth(i)).toContainText(formatAmount(b.paid));
    await expect(rows.nth(i)).toContainText(formatAmount(b.share));
    const word = b.balance > 0 ? 'Le deben' : b.balance < 0 ? 'Debe' : 'Al día';
    await expect(rows.nth(i)).toContainText(word);
  }
  await expect(
    chart.getByRole('button', { name: 'Cabaña: $150.000' })
  ).toHaveCount(1);
  const legend = chart.getByRole('list', { name: 'Leyenda de gastos' });
  await expect(legend.locator('li')).toHaveCount(7);
  await expect(legend).toContainText('Uber al terminal');

  // Keyboard: focus a segment, see its tooltip.
  await chart.getByRole('button', { name: 'Cabaña: $150.000' }).focus();
  await expect(
    page.getByRole('dialog', { name: 'Cabaña: $150.000' })
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
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
  }
  await expect(dialog.getByText('4 · Se salda')).toBeVisible();
  const transfers = suggestTransfers(tripGroup);
  await expect(dialog.locator('[data-slot="transfer"]')).toHaveCount(
    transfers.length
  );
  await expect(dialog.locator('[data-slot="transfer"]').first()).toContainText(
    formatAmount(transfers[0].amount)
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
      for (let i = 0; i < 4; i++) {
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
        page.getByRole('heading', { name: 'Pagó vs. su parte' })
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
      for (let i = 0; i < 3; i++) {
        await dialog.getByRole('button', { name: 'Paso siguiente' }).click();
      }
      await page.waitForTimeout(900);
      await expectNoSeriousViolations(page);
    });
  });
}
