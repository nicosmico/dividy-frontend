import { expect, test } from '@playwright/test';

import { createSnapshot } from '../src/domain';
import { sampleGroups, seedDocument } from './seed';

/**
 * TEMPORARY diagnostic (not for main): why the share flow fails on mobile
 * WebKit once "Crear mi primer grupo" moved above the example. Logs the
 * toast position, scroll and page height every 200 ms on the welcome page.
 */
test('diagnóstico: bienvenida tras eliminar la última captura', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit', 'solo WebKit');
  const logs: string[] = [];
  page.on('console', (m) => logs.push(`console.${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

  const group = sampleGroups()[0];
  const snapshot = createSnapshot(group, '2026-11-24T13:42:00.000Z');
  await seedDocument(page, { version: 4, groups: [], snapshots: [snapshot] });
  await page.goto(`/shared/${snapshot.sourceGroupId}/balances`);
  const remove = page.getByRole('button', { name: 'Eliminar captura' });
  await remove.scrollIntoViewIfNeeded();
  await remove.click();
  await expect(page.getByText('Captura eliminada').last()).toBeVisible();

  const samples: string[] = [];
  for (let i = 0; i < 20; i++) {
    samples.push(
      await page.evaluate(() => {
        const t = document.querySelector('[data-sonner-toast]');
        const r = t?.getBoundingClientRect();
        return [
          `y=${Math.round(window.scrollY)}`,
          `docH=${document.documentElement.scrollHeight}`,
          `vh=${window.innerHeight}`,
          `vvH=${Math.round(window.visualViewport?.height ?? -1)}`,
          `vvTop=${Math.round(window.visualViewport?.offsetTop ?? -1)}`,
          `toast=${r ? `${Math.round(r.top)},${Math.round(r.height)}` : 'none'}`,
          `toasts=${document.querySelectorAll('[data-sonner-toast]').length}`,
          `locked=${document.body.hasAttribute('data-scroll-locked')}`,
        ].join(' ');
      })
    );
    await page.waitForTimeout(200);
  }
  console.log('DIAG samples\n' + samples.join('\n'));

  const start = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const dom = Date.now() - start;
  await page
    .getByRole('heading', { name: 'Divide gastos sin enredos' })
    .waitFor({ timeout: 15000 })
    .catch(() => logs.push('heading not found in 15 s'));
  console.log(
    `DIAG reload domcontentloaded=${dom}ms heading=${Date.now() - start}ms`
  );
  console.log('DIAG logs\n' + logs.join('\n'));
});
