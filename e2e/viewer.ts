import { expect, type Page } from '@playwright/test';

export const VIEWERS_KEY = 'dividy.viewers';

type Choice = { memberId: string } | { none: true };

/**
 * Saves "who am I" choices (`group:<id>`, `snapshot:<id>`) in localStorage
 * before the app loads, only on the first load (reloads keep the app's own
 * changes). They live in their own key, apart from the groups (ADR 0007).
 */
export async function seedViewers(page: Page, choices: Record<string, Choice>) {
  await page.addInitScript(
    ([key, raw]) => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, raw);
      }
    },
    [VIEWERS_KEY, JSON.stringify({ version: 1, choices })] as const
  );
}

/** "No soy parte de este grupo" / "Solo estoy mirando": saves `none` and waits for the sheet to close. */
export async function skipViewerSheet(page: Page) {
  const sheet = page.getByRole('dialog', { name: '¿Quién eres?' });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole('button', {
      name: /No soy parte de este grupo|Solo estoy mirando/,
    })
    .click();
  await expect(sheet).toBeHidden();
}

/** Taps your face in "¿Quién eres?" and waits for the sheet to close. */
export async function chooseViewer(page: Page, name: string) {
  const sheet = page.getByRole('dialog', { name: '¿Quién eres?' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: `Soy ${name}` }).click();
  await expect(sheet).toBeHidden();
}
