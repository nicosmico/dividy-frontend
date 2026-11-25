import { expect, test } from '@playwright/test';

import { expectNoSeriousViolations } from './axe';
import { createSnapshot } from '../src/domain';
import { sampleGroups, seedDocument, seedGroups } from './seed';
import { snapshotPath } from './snapshot-link';
import { skipViewerSheet } from './viewer';

const TAKEN = '2026-11-24T13:42:00.000Z';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (axe, sin violaciones serious ni critical), modo ${colorScheme}`, () => {
    // The system theme drives the app: no choice is saved in localStorage.
    test.use({ colorScheme });

    test('Mis grupos vacío y Crear grupo', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Divide gastos sin enredos' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.getByRole('link', { name: 'Crear mi primer grupo' }).click();
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

    test('Formulario de gasto en modo Montos y Partes', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/expenses');
      await page.getByRole('button', { name: /Agregar gasto/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
      await dialog.getByLabel('Monto', { exact: true }).fill('100000');
      await dialog.getByRole('radio', { name: 'Montos' }).click();
      await expect(dialog.getByLabel('Monto de Ana')).toBeVisible();
      await expectNoSeriousViolations(page);

      // With the "faltan" line and the error shown.
      await dialog.getByLabel('Monto de Ana').fill('1');
      await dialog.getByRole('button', { name: 'Guardar' }).click();
      await expect(dialog.getByRole('alert').first()).toBeVisible();
      await expectNoSeriousViolations(page);

      await dialog.getByRole('radio', { name: 'Partes' }).click();
      await expect(dialog.getByLabel('Partes de Ana')).toBeVisible();
      await expectNoSeriousViolations(page);

      await dialog.getByRole('radio', { name: '%' }).click();
      await expect(dialog.getByLabel('Porcentaje de Ana')).toBeVisible();
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
      await expect(page.getByText('Lo que gastó en el grupo')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('button', { name: /^Marcar como pagado/ })
        .first()
        .click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Captura de solo lectura: Gastos y Saldos', async ({ page }) => {
      await page.goto(snapshotPath(sampleGroups()[0], TAKEN));
      await skipViewerSheet(page);
      await expect(
        page.getByRole('region', { name: 'Captura de solo lectura' })
      ).toBeVisible();
      await expect(page.getByText('Supermercado')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('navigation', { name: 'Secciones del grupo' })
        .getByRole('link', { name: 'Saldos' })
        .click();
      await expect(page.getByText('Para quedar al día')).toBeVisible();
      await expectNoSeriousViolations(page);

      await page
        .getByRole('button', { name: /^Ana\s*(Le deben|Debe|Al día)/ })
        .click();
      await expect(page.getByText('Lo que gastó en el grupo')).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Captura abierta con "Ver cómo se calculó"', async ({ page }) => {
      await page.goto(snapshotPath(sampleGroups()[0], TAKEN));
      await skipViewerSheet(page);
      await page
        .getByRole('navigation', { name: 'Secciones del grupo' })
        .getByRole('link', { name: 'Saldos' })
        .click();
      await page.getByRole('button', { name: /Ver cómo se calculó/ }).click();
      await expect(
        page.getByRole('dialog', { name: 'Cómo se calculó' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Link que no se pudo abrir', async ({ page }) => {
      await page.goto('/shared#v1.esto-no-es-una-captura');
      await expect(
        page.getByRole('heading', { name: 'Este link no se pudo abrir' })
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('Mis grupos con "Compartidos conmigo" y captura guardada', async ({
      page,
    }) => {
      const [trip] = sampleGroups();
      const saved = createSnapshot({ ...trip, id: 'otro-grupo' }, TAKEN);
      await seedDocument(page, {
        version: 4,
        groups: sampleGroups(),
        snapshots: [saved],
      });
      await page.goto('/');
      await expect(
        page.getByRole('heading', {
          name: 'Compartidos conmigo · solo lectura',
        })
      ).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.goto('/shared/otro-grupo/expenses');
      await expect(
        page.getByRole('button', { name: 'Eliminar captura' })
      ).toBeVisible();
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

      await expect(dialog.getByText('Así cambian las cuentas')).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  });
}
