import { expect, test, type Locator, type Page } from '@playwright/test';

import { makeGroup } from '../src/domain/test-utils/fixtures';
import { seedGroups } from './seed';

/**
 * Regression: no bottom sheet may scroll or overflow horizontally (seen on
 * Safari iOS, where native date inputs have an intrinsic minimum width).
 * Only meaningful on the mobile projects, where forms open as bottom sheets.
 */
test.skip(
  ({ isMobile }) => !isMobile,
  'Solo aplica a los bottom sheets móviles'
);

const LONG_NAME = 'M'.repeat(40);
const LONG_DESCRIPTION = 'Supercalifragilisticoespialidoso'
  .repeat(2)
  .slice(0, 80);

test.beforeEach(async ({ page }) => {
  const group = makeGroup({
    name: 'Viaje a Pucón',
    members: ['Ana', 'Beto', LONG_NAME],
    expenses: [
      {
        id: 'e1',
        description: LONG_DESCRIPTION,
        amount: 999999999,
        payer: 'Ana',
        among: ['Ana', 'Beto', LONG_NAME],
        date: '2026-03-10',
      },
      {
        id: 'e2',
        description: 'Taxi',
        amount: 3000,
        payer: LONG_NAME,
        among: [LONG_NAME, 'Ana'],
        date: '2026-03-09',
      },
    ],
    payments: [{ id: 'p1', from: 'Beto', to: LONG_NAME, amount: 500 }],
  });
  await seedGroups(page, [group]);
});

/** Asserts nothing in the page or the sheet overflows horizontally. */
async function expectNoHorizontalOverflow(page: Page, sheet: Locator) {
  await expect(sheet).toBeVisible();
  // Let the slide-in animation finish before measuring.
  await page.waitForTimeout(600);
  const result = await sheet.evaluate((el) => {
    const doc = document.documentElement;
    const sheetRect = el.getBoundingClientRect();
    const scrollers: string[] = [];
    const sticking: string[] = [];
    for (const node of [el, ...el.querySelectorAll<HTMLElement>('*')]) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (style.position === 'absolute' && rect.width <= 1) continue; // sr-only
      const scrolls = ['auto', 'scroll', 'hidden'].includes(style.overflowX);
      if (scrolls && node.scrollWidth > node.clientWidth) {
        scrollers.push(
          `${node.tagName.toLowerCase()}.${node.className} (${node.scrollWidth} > ${node.clientWidth})`
        );
      }
      if (rect.width === 0 || rect.height === 0) continue;
      if (
        rect.left < sheetRect.left - 0.5 ||
        rect.right > sheetRect.right + 0.5
      ) {
        sticking.push(
          `${node.tagName.toLowerCase()} "${(node.textContent ?? '').slice(0, 30)}" [${Math.round(rect.left)}, ${Math.round(rect.right)}] vs sheet [${Math.round(sheetRect.left)}, ${Math.round(sheetRect.right)}]`
        );
      }
    }
    return {
      docOverflow: doc.scrollWidth > doc.clientWidth,
      scrollers,
      sticking,
    };
  });
  expect(result.docOverflow, 'el documento tiene scroll horizontal').toBe(
    false
  );
  expect(result.sticking, 'elementos fuera del sheet').toEqual([]);
  expect(result.scrollers, 'contenedores con desborde horizontal').toEqual([]);
  expect(result.sticking, 'elementos fuera del sheet').toEqual([]);
}

test('nuevo gasto con descripción larga y monto máximo no se desborda', async ({
  page,
}) => {
  await page.goto('/groups/g1/expenses');
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const sheet = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await sheet.getByLabel('Descripción').fill(LONG_DESCRIPTION);
  await sheet.getByLabel('Monto', { exact: true }).fill('999999999');
  await expect(sheet.getByLabel('Monto', { exact: true })).toHaveValue(
    '999.999.999'
  );
  await expectNoHorizontalOverflow(page, sheet);
  // The date input in particular must fit the sheet's content width.
  const date = sheet.getByLabel('Fecha');
  const [dateBox, sheetBox] = [
    await date.boundingBox(),
    await sheet.boundingBox(),
  ];
  expect(dateBox!.x + dateBox!.width).toBeLessThanOrEqual(
    sheetBox!.x + sheetBox!.width
  );
});

test('nuevo gasto con montos, % y partes y un nombre largo no se desborda', async ({
  page,
}) => {
  await page.goto('/groups/g1/expenses');
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const sheet = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await sheet.getByLabel('Descripción').fill(LONG_DESCRIPTION);
  await sheet.getByLabel('Monto', { exact: true }).fill('999999999');

  await sheet.getByRole('radio', { name: 'Montos' }).click();
  const field = sheet.getByLabel(`Monto de ${LONG_NAME}`);
  await expect(field).toBeVisible();
  await field.fill('999999999');
  await field.blur();
  await expect(field).toHaveValue('999.999.999');
  // The status line ("Asignado … de … · te pasaste por …") wraps, never widens.
  await expectNoHorizontalOverflow(page, sheet);

  await sheet.getByRole('radio', { name: '%' }).click();
  await sheet.getByLabel(`Porcentaje de ${LONG_NAME}`).fill('100,00');
  await expectNoHorizontalOverflow(page, sheet);

  await sheet.getByRole('radio', { name: 'Partes' }).click();
  await sheet.getByLabel(`Partes de ${LONG_NAME}`).fill('999999');
  await expectNoHorizontalOverflow(page, sheet);

  // The field and the status line stay inside the sheet's width.
  const status = sheet.locator('p[aria-live="polite"]');
  await expect(status).toBeVisible();
  const [statusBox, sheetBox] = [
    await status.boundingBox(),
    await sheet.boundingBox(),
  ];
  expect(statusBox!.x + statusBox!.width).toBeLessThanOrEqual(
    sheetBox!.x + sheetBox!.width
  );
});

test('editar un gasto con datos largos no se desborda', async ({ page }) => {
  await page.goto('/groups/g1/expenses');
  await page
    .getByRole('button', { name: new RegExp(LONG_DESCRIPTION) })
    .click();
  const sheet = page.getByRole('dialog', { name: 'Editar gasto' });
  await expectNoHorizontalOverflow(page, sheet);
});

test('renombrar grupo no se desborda', async ({ page }) => {
  await page.goto('/groups/g1/expenses');
  await page.getByRole('button', { name: 'Opciones del grupo' }).click();
  await page.getByRole('menuitem', { name: /Editar grupo/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Editar grupo' });
  await sheet.getByLabel('Nombre').fill('G'.repeat(40));
  await expectNoHorizontalOverflow(page, sheet);
});

test('renombrar miembro con nombre largo no se desborda', async ({ page }) => {
  await page.goto('/groups/g1/members');
  await page.getByRole('button', { name: `Editar a ${LONG_NAME}` }).click();
  const sheet = page.getByRole('dialog', { name: 'Editar miembro' });
  await expectNoHorizontalOverflow(page, sheet);
});

test('eliminar miembro con movimientos no se desborda en ninguna opción', async ({
  page,
}) => {
  await page.goto('/groups/g1/members');
  await page.getByRole('button', { name: `Eliminar a ${LONG_NAME}` }).click();
  const sheet = page.getByRole('dialog', { name: `Eliminar a ${LONG_NAME}` });
  await expectNoHorizontalOverflow(page, sheet);

  await sheet.getByText('Reasignar a…').click();
  await expect(sheet.getByLabel('¿A quién se los pasas?')).toBeVisible();
  await expectNoHorizontalOverflow(page, sheet);

  await sheet.getByText('Eliminar con sus gastos y pagos').click();
  await expect(sheet.getByText(/Se borrar/)).toBeVisible();
  await expectNoHorizontalOverflow(page, sheet);
});
