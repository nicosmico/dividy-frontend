import { expect, test } from '@playwright/test';

import { makeGroup } from '../src/domain/test-utils/fixtures';
import { openTab } from './navigation';
import { seedDocument } from './seed';
import { skipViewerSheet } from './viewer';

test('los nombres y las descripciones se guardan con mayúscula inicial y persisten', async ({
  page,
}) => {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill('viaje al sur');
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const name of ['ana', 'beto']) {
    await memberInput.fill(name);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await skipViewerSheet(page);
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
  await expect(
    page.getByRole('heading', { name: 'Viaje al sur', level: 1 })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill('pizza');
  await dialog.getByLabel('Monto').fill('10000');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Pizza', { exact: true })).toBeVisible();

  await openTab(page, 'Miembros');
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await expect(page.getByText('Beto', { exact: true })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Viaje al sur', level: 1 })
  ).toBeVisible();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await expect(page.getByText('Beto', { exact: true })).toBeVisible();
  await openTab(page, 'Gastos');
  await expect(page.getByText('Pizza', { exact: true })).toBeVisible();
});

test('migra un documento v1 en minúsculas a v2 con mayúscula inicial', async ({
  page,
}) => {
  const group = makeGroup({
    name: 'viaje al sur',
    members: ['ana', 'beto'],
    expenses: [
      {
        id: 'e1',
        description: 'pizza',
        amount: 10000,
        payer: 'ana',
        among: ['ana', 'beto'],
      },
    ],
  });
  await seedDocument(page, { version: 1, groups: [group] });

  await page.goto('/');
  const card = page.getByRole('link', { name: /Viaje al sur/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByText('Pizza', { exact: true })).toBeVisible();
  await openTab(page, 'Miembros');
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await expect(page.getByText('Beto', { exact: true })).toBeVisible();

  // Any save writes the document as v2; the migrated data persists.
  await page.reload();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
});
