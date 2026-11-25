import { expect, test, type Page } from '@playwright/test';

import { expectNoSeriousViolations } from './axe';
import { filterGroup, seedGroups } from './seed';
import { seedViewers } from './viewer';

/** Beto, as the viewer: see `filterGroup` for the numbers below. */
async function openAsBeto(page: Page, search = '') {
  await seedViewers(page, { 'group:g1': { memberId: 'Beto' } });
  await seedGroups(page, [filterGroup()], { askViewer: true });
  await page.goto(`/groups/g1/expenses${search}`);
  await expect(page.getByRole('group', { name: 'Filtros' })).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const chip = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Filtros' }).getByRole('button', { name });
const searchBox = (page: Page) =>
  page.getByRole('textbox', { name: 'Buscar gasto' });

test('buscar, filtrar por chip y por persona, recargar, atrás, sin resultados, limpiar y bajar a 10 gastos', async ({
  page,
}) => {
  await openAsBeto(page);
  await expect(page.getByText('Total del grupo')).toBeVisible();
  await expect(page.getByText('12 gastos')).toBeVisible();
  // Each row says what part is yours.
  await expect(page.getByRole('button', { name: /Cabaña/ })).toContainText(
    'Tu parte $20.000'
  );
  await expect(page.getByRole('button', { name: /Café/ })).toContainText(
    'No participas'
  );

  // Search without the accent: "cabana" finds "Cabaña".
  await searchBox(page).fill('cabana');
  await expect(page.getByText('Coinciden con "cabana"')).toBeVisible();
  await expect(
    page.getByText('1 de 12 gastos · tu parte $20.000')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Taxi/ })).toHaveCount(0);

  // The chip adds to the search.
  await chip(page, 'Donde participo').click();
  await expect(chip(page, 'Donde participo')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(
    page.getByText('1 de 12 gastos · Donde participas · tu parte $20.000')
  ).toBeVisible();

  // Without the search, the chip alone: 9 expenses, 174.001 in total.
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await expect(
    page.getByText('Donde participas', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('$174.001')).toBeVisible();
  await expect(
    page.getByText('9 de 12 gastos · tu parte $65.501')
  ).toBeVisible();
  await expect(page).toHaveURL(/\?f=mine$/);

  // Another chip replaces it.
  await chip(page, 'Pagué yo').click();
  await expect(chip(page, 'Donde participo')).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await expect(page.getByText('Lo que pagaste')).toBeVisible();
  await expect(
    page.getByText('3 de 12 gastos · tu parte $17.500')
  ).toBeVisible();

  // "Persona": what Carla paid.
  await chip(page, 'Persona').click();
  const sheet = page.getByRole('dialog', { name: 'Gastos de una persona' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Beto (tú)' })).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: 'Ver gastos' })
  ).toBeDisabled();
  await sheet.getByRole('button', { name: 'Carla' }).click();
  await expect(
    sheet.getByRole('button', { name: 'Ver 9 gastos de Carla' })
  ).toBeVisible();
  await sheet.getByRole('radio', { name: 'Lo que pagó' }).click();
  await sheet.getByRole('button', { name: 'Ver 5 gastos de Carla' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText('Lo que pagó Carla')).toBeVisible();
  await expect(page.getByText('$55.001')).toBeVisible();
  await expect(
    page.getByText('5 de 12 gastos · tu parte $22.001')
  ).toBeVisible();
  await expect(chip(page, 'Carla pagó')).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  // A reload keeps it...
  await page.reload();
  await expect(page.getByText('Lo que pagó Carla')).toBeVisible();
  await expect(chip(page, 'Carla pagó')).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  // ...and "back" takes the filter off (it goes back to the one before).
  await page.goBack();
  await expect(page.getByText('Lo que pagaste')).toBeVisible();
  await expect(page.getByText('Lo que pagó Carla')).toHaveCount(0);
  await expect(chip(page, 'Persona')).toHaveAttribute('aria-pressed', 'false');

  // No results, and "Limpiar filtros" clears chip and search.
  await searchBox(page).fill('kayak');
  await expect(
    page.getByText('No hay gastos que coincidan con "kayak".')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByText('Total del grupo')).toBeVisible();
  await expect(page.getByText('12 gastos')).toBeVisible();
  await expect(searchBox(page)).toHaveValue('');
  await expect(page).toHaveURL(/\/expenses$/);

  // Down to 10 expenses the box goes away, and so does what was typed.
  await searchBox(page).fill('pan');
  await expect(page).toHaveURL(/\?q=pan$/);
  await page.getByRole('button', { name: /^Pan/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  // 11 left: the box stays and the search is still there.
  await expect(searchBox(page)).toHaveValue('pan');
  await searchBox(page).fill('lena');
  await page.getByRole('button', { name: /^Leña/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(searchBox(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByText('Total del grupo')).toBeVisible();
  await expect(page.getByText('10 gastos')).toBeVisible();
});

test('sin saber quién eres solo está "Persona" y se ignora ?f=mine', async ({
  page,
}) => {
  await seedGroups(page, [filterGroup()]);
  await page.goto('/groups/g1/expenses?f=mine');
  await expect(chip(page, 'Persona')).toBeVisible();
  await expect(chip(page, 'Donde participo')).toHaveCount(0);
  await expect(page.getByText('Total del grupo')).toBeVisible();
  await expect(page.getByText(/Tu parte/)).toHaveCount(0);
});

test('sin scroll horizontal con filtros, búsqueda y la hoja de Persona', async ({
  page,
}) => {
  await openAsBeto(page, '?f=mine&q=a');
  await expect(page.getByText('Coinciden con "a"')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await chip(page, 'Persona').click();
  await expect(
    page.getByRole('dialog', { name: 'Gastos de una persona' })
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (axe), modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('con un filtro activo y buscando', async ({ page }) => {
      await openAsBeto(page, '?f=mine&q=a');
      await expect(page.getByText('Coinciden con "a"')).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('con la hoja de Persona abierta', async ({ page }) => {
      await openAsBeto(page);
      await chip(page, 'Persona').click();
      const sheet = page.getByRole('dialog', { name: 'Gastos de una persona' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('button', { name: 'Carla' }).click();
      await expectNoSeriousViolations(page);
    });

    test('sin resultados', async ({ page }) => {
      await openAsBeto(page, '?q=kayak');
      await expect(page.getByText(/No hay gastos que coincidan/)).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  });
}
