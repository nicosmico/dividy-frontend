import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { sampleGroups, seedGroups } from './seed';

/** Fails on any `serious` or `critical` violation and prints what to fix. */
async function expectNoSeriousViolations(page: Page) {
  // Avatars are generated on demand; wait until they replace the placeholders.
  await expect(page.locator('span[role="img"]')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  const serious = violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  expect(
    serious.map((v) => ({
      rule: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(' ')),
    }))
  ).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (axe, sin violaciones serious ni critical), modo ${colorScheme}`, () => {
    // The system theme drives the app: no choice is saved in localStorage.
    test.use({ colorScheme });

    test('Mis grupos vacío y Crear grupo', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Bienvenido a Dividy' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.getByRole('link', { name: 'Crear grupo' }).click();
      await expect(
        page.getByRole('heading', { name: 'Crear grupo' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      // With errors shown.
      await page.getByRole('button', { name: 'Crear grupo' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Mis grupos con grupos', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Mis grupos' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Gastos, formulario de gasto abierto', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/expenses');
      await expect(page.getByText('Supermercado')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.getByRole('button', { name: /Agregar gasto/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
      await expect(dialog).toBeVisible();
      await expectNoSeriousViolations(page);

      // With validation errors.
      await dialog.getByRole('button', { name: 'Guardar' }).click();
      await expect(dialog.getByRole('alert').first()).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Saldos con el desglose abierto', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/balances');
      await expect(page.getByText('Para quedar al día')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('button', { name: /^Ana\s*(Le deben|Debe|Al día)/ })
        .click();
      await expect(page.getByText('Pagó')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('button', { name: /^Marcar como pagado/ })
        .first()
        .click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Miembros y diálogo de eliminar miembro', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/members');
      await expect(page.getByText('3 miembros')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.getByRole('button', { name: 'Eliminar a Beto' }).click();
      const dialog = page.getByRole('dialog', { name: 'Eliminar a Beto' });
      await expect(dialog).toBeVisible();
      await expectNoSeriousViolations(page);

      await dialog.getByText('Reasignar a…').click();
      await expectNoSeriousViolations(page);
    });
  });
}
