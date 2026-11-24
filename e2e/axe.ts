import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Fails on any `serious` or `critical` violation and prints what to fix. */
export async function expectNoSeriousViolations(page: Page) {
  // Avatars are generated on demand; wait until they replace the placeholders.
  await expect(page.locator('span[role="img"]')).toHaveCount(0);
  // Wait for enter/exit animations (dialogs fade in): mid-fade colors are
  // blended and axe would measure a contrast the user never sees at rest.
  // Infinite animations (skeletons, pulses) are ignored.
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
