import { expect, test } from '@playwright/test';

/** Data exactly as the old app saved it (zustand/persist). */
const membersStore = {
  state: {
    members: {
      m1: { id: 'm1', name: 'Ana', picture: '' },
      m2: { id: 'm2', name: 'Beto', picture: '' },
      m3: { id: 'm3', name: 'Cami', picture: '' },
    },
    membersOrder: ['m1', 'm2', 'm3'],
  },
  version: 0,
};
const billsStore = {
  state: {
    bills: {
      b1: {
        id: 'b1',
        name: 'Pizza',
        total: 10000,
        paidBy: 'm1',
        members: ['m1', 'm2', 'm3'],
      },
    },
    billsOrder: ['b1'],
  },
  version: 0,
};

test('migra los datos de la versión antigua a un grupo "Mi grupo"', async ({
  page,
}) => {
  await page.addInitScript(
    ([members, bills]) => {
      // Seed only once so a reload does not re-create the old keys.
      if (!window.localStorage.getItem('seeded')) {
        window.localStorage.setItem('members-store', members);
        window.localStorage.setItem('bills-store', bills);
        window.localStorage.setItem('seeded', '1');
      }
    },
    [JSON.stringify(membersStore), JSON.stringify(billsStore)]
  );

  await page.goto('/');
  const card = page.getByRole('link', { name: /Mi grupo/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText('3 miembros');
  await expect(card).toContainText('$10.000');

  await card.click();
  await page
    .getByRole('navigation', { name: 'Secciones del grupo' })
    .getByRole('link', { name: 'Miembros' })
    .click();
  for (const name of ['Ana', 'Beto', 'Cami']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  // The old keys are gone and the new document is persisted.
  const keys = await page.evaluate(() => ({
    members: window.localStorage.getItem('members-store'),
    bills: window.localStorage.getItem('bills-store'),
    doc: window.localStorage.getItem('dividy'),
  }));
  expect(keys.members).toBeNull();
  expect(keys.bills).toBeNull();
  expect(keys.doc).toContain('Mi grupo');

  await page.reload();
  await expect(page.getByText('Cami', { exact: true })).toBeVisible();
});
