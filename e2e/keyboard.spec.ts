import { expect, test, type Page } from '@playwright/test';

import { sampleGroups, seedGroups } from './seed';

/**
 * True when the focused element shows an outline or a ring. Tailwind rings are
 * stacked box-shadows, so look for one with a spread and a visible color.
 */
async function focusIsVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) {
      return true;
    }
    const shadows = style.boxShadow.split(/,\s*(?![^(]*\))/);
    return shadows.some((shadow) => {
      const px = [...shadow.matchAll(/(-?[\d.]+)px/g)].map((m) => +m[1]);
      const spread = px[3] ?? 0;
      return spread > 0 && !/\b0\)\s*$/.test(shadow.split(/-?[\d.]+px/)[0]);
    });
  });
}

test.beforeEach(async ({ page }) => {
  await seedGroups(page, sampleGroups());
});

test('cada control alcanzable con Tab muestra el foco', async ({ page }) => {
  await page.goto('/groups/g1/expenses');
  await expect(page.getByText('Supermercado')).toBeVisible();
  const seen: string[] = [];
  // Tab through the whole page until focus leaves it (back to the browser).
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement === document.body)) {
      break;
    }
    const label = await page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label') ||
        document.activeElement?.textContent?.trim().slice(0, 30) ||
        document.activeElement?.tagName
    );
    seen.push(label ?? '');
    expect(await focusIsVisible(page), `sin foco visible en "${label}"`).toBe(
      true
    );
  }
  expect(seen.length).toBeGreaterThan(8);
  expect(seen.join(' | ')).toContain('Opciones del grupo');
  expect(seen.join(' | ')).toContain('Agregar gasto');
  expect(seen.join(' | ')).toContain('Supermercado');
});

test('"Saltar al contenido" es lo primero y lleva el foco al contenido', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test('el formulario de gasto atrapa el foco y al cerrarlo con Escape vuelve a la fila', async ({
  page,
}) => {
  await page.goto('/groups/g1/expenses');
  const row = page.getByRole('button', { name: /Supermercado/ });
  await row.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Editar gasto' });
  await expect(dialog).toBeVisible();

  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate((d) =>
      d.contains(document.activeElement)
    );
    expect(inside).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
});

test('al eliminar un gasto con el teclado el foco pasa a "Agregar gasto"', async ({
  page,
}) => {
  await page.goto('/groups/g1/expenses');
  await page.getByRole('button', { name: /Taxi/ }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Editar gasto' });
  await dialog.getByRole('button', { name: 'Eliminar gasto' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Taxi/ })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Agregar gasto/ })
  ).toBeFocused();
});

test('el diálogo de eliminar miembro devuelve el foco a su botón al cerrarse', async ({
  page,
}) => {
  await page.goto('/groups/g1/members');
  const trigger = page.getByRole('button', { name: 'Eliminar a Beto' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Eliminar a Beto' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('al eliminar un miembro sin movimientos con el teclado, el foco queda en la lista', async ({
  page,
}) => {
  await page.goto('/groups/g2/members');
  await page.getByRole('button', { name: 'Eliminar a Beto' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 miembro', { exact: true })).toBeVisible();
  await expect(page.locator('#members-heading')).toBeFocused();
  // And the undo button in the toast is reachable by keyboard.
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
});
