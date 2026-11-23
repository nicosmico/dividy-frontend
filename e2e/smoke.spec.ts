import { expect, test } from '@playwright/test';

test('home loads and leads to the members screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Dividy');
  await expect(page.getByText('¿Cómo funciona?')).toBeVisible();

  // The header nav and the hero both link to "Dividir gastos"; use the hero one.
  await page.getByRole('link', { name: 'Dividir gastos' }).last().click();

  await expect(page).toHaveURL(/\/split-bills\/members$/);
});
