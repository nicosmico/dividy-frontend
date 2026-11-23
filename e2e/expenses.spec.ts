import { expect, test, type Locator, type Page } from '@playwright/test';

import { computeBalances, formatAmount, suggestTransfers } from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';

async function createGroup(page: Page, name: string, members: string[]) {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill(name);
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const member of members) {
    await memberInput.fill(member);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
}

interface NewExpense {
  description: string;
  amount: number;
  payer?: string;
  /** Members to leave out of the split. */
  without?: string[];
}

async function addExpense(page: Page, expense: NewExpense) {
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill(expense.description);
  await dialog.getByLabel('Monto en pesos').fill(String(expense.amount));
  if (expense.payer) {
    await dialog.getByLabel('Pagado por').click();
    await page.getByRole('option', { name: expense.payer }).click();
  }
  for (const name of expense.without ?? []) {
    await dialog.getByRole('checkbox', { name }).click();
  }
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
}

function tab(page: Page, name: string): Locator {
  return page
    .getByRole('navigation', { name: 'Secciones del grupo' })
    .getByRole('link', { name });
}

test('flujo completo: gastos, saldos exactos, marcar pagos y quedar al día', async ({
  page,
}) => {
  await createGroup(page, 'Viaje a Pucón', ['Ana', 'Beto', 'Carla']);
  await addExpense(page, { description: 'Supermercado', amount: 10000 });
  await addExpense(page, {
    description: 'Taxi',
    amount: 3000,
    payer: 'Beto',
    without: ['Carla'],
  });
  await expect(page.getByText('2 gastos')).toBeVisible();
  await expect(page.getByText('$13.000', { exact: true })).toBeVisible();

  await tab(page, 'Saldos').click();

  // The same group computed by the domain: the UI must show those numbers.
  const group = makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        amount: 10000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
      },
      { amount: 3000, payer: 'Beto', among: ['Ana', 'Beto'] },
    ],
  });
  const balances = computeBalances(group);
  expect(balances.map((b) => b.balance)).toEqual([5166, -1833, -3333]);
  await expect(
    page.getByText(`Le deben ${formatAmount(balances[0].balance)}`)
  ).toBeVisible();
  await expect(
    page.getByText(`Debe ${formatAmount(-balances[1].balance)}`)
  ).toBeVisible();
  await expect(
    page.getByText(`Debe ${formatAmount(-balances[2].balance)}`)
  ).toBeVisible();

  const transfers = suggestTransfers(group);
  expect(transfers).toHaveLength(2);
  const list = page
    .getByRole('heading', { name: 'Para quedar al día' })
    .locator('xpath=ancestor::section[1]');
  for (const [i, t] of transfers.entries()) {
    const item = list.getByRole('listitem').nth(i);
    await expect(item).toContainText(`${t.fromId} → ${t.toId}`);
    await expect(item).toContainText(formatAmount(t.amount));
  }

  // The breakdown lets anyone check Ana's number by hand.
  await page.getByRole('button', { name: 'Ver detalle de Ana' }).click();
  await expect(page.getByText('Pagó en gastos')).toBeVisible();
  await expect(page.getByText('Le tocó $3.334')).toBeVisible();

  // Mark every suggested transfer as paid.
  for (let remaining = transfers.length; remaining > 0; remaining--) {
    await page
      .getByRole('button', { name: 'Marcar como pagado' })
      .first()
      .click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sí, registrar pago' })
      .click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
  }
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Marcar como pagado' })
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pagos registrados' })
  ).toBeVisible();
});

test('escribir rápido y guardar deja exactamente 1 gasto (hallazgo 2)', async ({
  page,
}) => {
  await createGroup(page, 'Rápido', ['Ana', 'Beto']);
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog
    .getByLabel('Descripción')
    .pressSequentially('Supermercado', { delay: 20 });
  await dialog
    .getByLabel('Monto en pesos')
    .pressSequentially('12345', { delay: 20 });
  await expect(dialog.getByLabel('Monto en pesos')).toHaveValue('12.345');
  await dialog.getByRole('button', { name: 'Guardar' }).dblclick();
  await expect(dialog).toBeHidden();

  await expect(page.getByText('1 gasto', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Supermercado/ })).toHaveCount(
    1
  );
  await page.reload();
  await expect(page.getByRole('button', { name: /Supermercado/ })).toHaveCount(
    1
  );
});

test('al eliminar un gasto y abrir el otro, se muestran sus propios datos (hallazgo 1)', async ({
  page,
}) => {
  await createGroup(page, 'Dos gastos', ['Ana', 'Beto']);
  await addExpense(page, { description: 'Asado', amount: 9000 });
  await addExpense(page, {
    description: 'Bencina',
    amount: 5000,
    payer: 'Beto',
  });

  // Newest first: Bencina is on top.
  await page.getByRole('button', { name: /Bencina/ }).click();
  const edit = page.getByRole('dialog', { name: 'Editar gasto' });
  await edit.getByRole('button', { name: 'Eliminar gasto' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Eliminar', exact: true })
    .click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole('button', { name: /Bencina/ })).toHaveCount(0);

  await page.getByRole('button', { name: /Asado/ }).click();
  await expect(edit.getByLabel('Descripción')).toHaveValue('Asado');
  await expect(edit.getByLabel('Monto en pesos')).toHaveValue('9.000');
  await expect(edit.getByLabel('Pagado por')).toContainText('Ana');
});

test('eliminar en cascada al único participante no deja gastos sin participantes (hallazgo 4)', async ({
  page,
}) => {
  await createGroup(page, 'Cascada', ['Ana', 'Beto', 'Carla']);
  await addExpense(page, {
    description: 'Solo Carla',
    amount: 3000,
    without: ['Ana', 'Beto'],
  });
  await addExpense(page, {
    description: 'Cena',
    amount: 6000,
    without: ['Beto'],
  });

  await tab(page, 'Miembros').click();
  await page.getByRole('button', { name: 'Eliminar a Carla' }).click();
  const dialog = page.getByRole('dialog', { name: 'Eliminar a Carla' });
  await dialog.getByText('Eliminar con sus gastos').click();
  await dialog.getByRole('button', { name: 'Eliminar a Carla' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('2 miembros')).toBeVisible();

  await tab(page, 'Gastos').click();
  await expect(page.getByRole('button', { name: /Solo Carla/ })).toHaveCount(0);
  // "Cena" stays with Ana as the only participant.
  await page.getByRole('button', { name: /Cena/ }).click();
  const edit = page.getByRole('dialog', { name: 'Editar gasto' });
  await expect(edit.getByRole('checkbox', { name: 'Ana' })).toBeChecked();
  await expect(edit.getByRole('checkbox', { name: 'Beto' })).not.toBeChecked();
  await edit.getByRole('button', { name: 'Cancelar' }).click();

  // Ana paid her own dinner: every balance is 0.
  await tab(page, 'Saldos').click();
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
  await expect(page.getByText('Al día', { exact: true })).toHaveCount(2);
});
