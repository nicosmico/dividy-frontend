import { expect, test, type Page } from '@playwright/test';

import { createSnapshot } from '../src/domain';
import { sampleGroups, seedDocument, seedGroups } from './seed';
import { snapshotPath } from './snapshot-link';
import { seedViewers } from './viewer';

/**
 * Visual regression: one screenshot per main screen, in light and dark.
 * Runs only in the `visual` project (390x844, reduced motion, es-CL,
 * America/Santiago) and its baselines are rendered in the Playwright Docker
 * image: see "Regresión visual" in docs/testing.md before touching this file.
 */

/** Fixed "now": the app formats dates and relative times from it. */
const NOW = '2026-11-24T11:45:00-03:00';
const TAKEN = '2026-11-24T13:42:00.000Z';

const SHOT = {
  animations: 'disabled',
  caret: 'hide',
  maxDiffPixelRatio: 0.005,
} as const;

/**
 * Waits for everything that paints late: web fonts, the lazy DiceBear
 * avatars (placeholders are `span[role="img"]`, real ones `<img>`) and any
 * enter animation (dialogs fade in).
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('span[role="img"]')).toHaveCount(0);
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete)
  );
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== 'running' ||
          a.effect?.getTiming().iterations === Infinity
      )
  );
}

async function shot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { ...SHOT, fullPage });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`regresión visual, modo ${colorScheme}`, () => {
    // The system theme drives the app: no choice is saved in localStorage.
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(NOW);
    });

    test('Bienvenida', async ({ page }) => {
      // Reduced motion: no autoplay, so the first frame is the stable one.
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'Divide gastos sin enredos' })
      ).toBeVisible();
      await expect(page.getByText('1 · Cada uno paga')).toBeVisible();
      // The bars grow once, 60 ms after mounting; toHaveScreenshot also
      // retries until two consecutive captures are equal.
      await page.waitForTimeout(300);
      await shot(page, `welcome-${colorScheme}`);
    });

    test('Mis grupos con "Compartidos conmigo"', async ({ page }) => {
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
      await shot(page, `groups-${colorScheme}`, true);
    });

    test('Gastos', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/expenses');
      await expect(page.getByText('Supermercado')).toBeVisible();
      await shot(page, `expenses-${colorScheme}`);
    });

    test('Nuevo gasto', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/expenses');
      await page.getByRole('button', { name: /Agregar gasto/ }).click();
      await expect(
        page.getByRole('dialog', { name: 'Nuevo gasto' })
      ).toBeVisible();
      // The date field starts on today (the fixed clock), so it is stable.
      await shot(page, `new-expense-${colorScheme}`);
    });

    test('Nuevo gasto por partes', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/expenses');
      await page.getByRole('button', { name: /Agregar gasto/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('Descripción').fill('Cabaña');
      await dialog.getByLabel('Monto en pesos').fill('150000');
      await dialog.getByRole('radio', { name: 'Partes' }).click();
      await dialog.getByLabel('Partes de Ana').fill('2');
      await expect(dialog.getByText('2 partes · $75.000')).toBeVisible();
      // Leave the field so the caret and focus ring do not show.
      await dialog.getByLabel('Partes de Ana').blur();
      await shot(page, `new-expense-shares-${colorScheme}`);
    });

    test('Saldos', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/balances');
      await expect(page.getByText('Para quedar al día')).toBeVisible();
      await shot(page, `balances-${colorScheme}`, true);
    });

    test('Miembros', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/members');
      await expect(page.getByText('3 miembros')).toBeVisible();
      await shot(page, `members-${colorScheme}`);
    });

    test('Ver cómo se calculó, paso 4', async ({ page }) => {
      await seedGroups(page, sampleGroups());
      await page.goto('/groups/g1/balances');
      await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
      const dialog = page.getByRole('dialog', { name: 'Cómo se calculó' });
      await expect(dialog).toBeVisible();
      const next = dialog.getByRole('button', { name: 'Paso siguiente' });
      for (let i = 0; i < 12; i++) {
        const step = await dialog.locator('section').getAttribute('data-step');
        if (step === '3') break;
        await next.click();
      }
      await expect(dialog.locator('section')).toHaveAttribute('data-step', '3');
      await page.waitForTimeout(300);
      await shot(page, `explanation-step4-${colorScheme}`);
    });

    test('Saldos, viendo como quien debe', async ({ page }) => {
      await seedViewers(page, { 'group:g1': { memberId: 'Beto' } });
      await seedGroups(page, sampleGroups(), { askViewer: true });
      await page.goto('/groups/g1/balances');
      await expect(page.getByText('Debes $1.333')).toBeVisible();
      await shot(page, `balances-viewer-${colorScheme}`);
    });

    test('¿Quién eres? al abrir una captura', async ({ page }) => {
      await page.goto(snapshotPath(sampleGroups()[0], TAKEN));
      await expect(
        page.getByRole('dialog', { name: '¿Quién eres?' })
      ).toBeVisible();
      await shot(page, `viewer-sheet-${colorScheme}`);
    });

    test('Captura de solo lectura', async ({ page }) => {
      // Already answered "Solo estoy mirando", so the sheet does not cover it.
      await seedViewers(page, { 'snapshot:g1': { none: true } });
      await page.goto(snapshotPath(sampleGroups()[0], TAKEN));
      await expect(
        page.getByRole('region', { name: 'Captura de solo lectura' })
      ).toBeVisible();
      await expect(page.getByText('Supermercado')).toBeVisible();
      await shot(page, `snapshot-${colorScheme}`);
    });

    test('Link que no se pudo abrir', async ({ page }) => {
      await page.goto('/shared#v1.esto-no-es-una-captura');
      await expect(
        page.getByRole('heading', { name: 'Este link no se pudo abrir' })
      ).toBeVisible();
      await shot(page, `invalid-link-${colorScheme}`);
    });
  });
}
