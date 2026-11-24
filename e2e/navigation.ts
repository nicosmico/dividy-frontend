import { expect, type Locator, type Page } from '@playwright/test';

type Tab = 'Gastos' | 'Saldos' | 'Miembros';

const PATHS: Record<Tab, RegExp> = {
  Gastos: /\/expenses$/,
  Saldos: /\/balances$/,
  Miembros: /\/members$/,
};

export function tab(page: Page, name: Tab): Locator {
  return page
    .getByRole('navigation', { name: 'Secciones del grupo' })
    .getByRole('link', { name });
}

/**
 * Opens a group tab and waits until the previous tab's content is gone.
 *
 * Route changes run in a transition, so for a moment the URL already points
 * to the new tab while the old one is still on screen. Saldos and Gastos both
 * have buttons named after expenses (chart segments and list rows), so a
 * locator used too early can match the wrong tab.
 */
export async function openTab(page: Page, name: Tab): Promise<void> {
  await tab(page, name).click();
  await expect(page).toHaveURL(PATHS[name]);
  const main = page.getByRole('main');
  if (name !== 'Gastos') {
    await expect(main.getByText('Total del grupo')).toHaveCount(0);
  }
  if (name !== 'Saldos') {
    await expect(main.getByText('Saldo por miembro')).toHaveCount(0);
    await expect(main.getByText('Gastó vs. su parte')).toHaveCount(0);
  }
}
