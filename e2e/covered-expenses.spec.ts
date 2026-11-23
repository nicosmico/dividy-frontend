import { expect, test, type Page } from '@playwright/test';

import {
  computeBalances,
  formatAmount,
  previewBalanceChange,
  removeExpense,
  suggestTransfers,
  type BalanceChange,
} from '../src/domain';
import { makeGroup } from '../src/domain/test-utils/fixtures';

const MEMBERS = ['Ana', 'Beto', 'Carla'];

async function createGroup(page: Page) {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill('Viaje a Pucón');
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const member of MEMBERS) {
    await memberInput.fill(member);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
}

async function addExpense(page: Page, description: string, amount: number) {
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill(description);
  await dialog.getByLabel('Monto en pesos').fill(String(amount));
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
}

function tab(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: 'Secciones del grupo' })
    .getByRole('link', { name });
}

async function settleEverything(page: Page) {
  await tab(page, 'Saldos').click();
  const transfers = suggestTransfers(
    makeGroup({
      members: MEMBERS,
      expenses: [{ amount: 10000, payer: 'Ana', among: MEMBERS }],
    })
  );
  for (let remaining = transfers.length; remaining > 0; remaining--) {
    await page
      .getByRole('button', { name: /^Marcar como pagado/ })
      .first()
      .click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sí, registrar pago' })
      .click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
  }
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
  await tab(page, 'Gastos').click();
}

/** Same words as the Saldos tab: "Al día", "Debe $X", "Le deben $X". */
function words(balance: number) {
  if (balance > 0) return `Le deben ${formatAmount(balance)}`;
  if (balance < 0) return `Debe ${formatAmount(-balance)}`;
  return 'Al día';
}

/** The preview the domain computes for deleting the $10.000 expense after the payments. */
function expectedChanges(): BalanceChange[] {
  const group = makeGroup({
    members: MEMBERS,
    expenses: [
      {
        id: 'e1',
        amount: 10000,
        payer: 'Ana',
        among: MEMBERS,
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ],
    payments: suggestTransfers(
      makeGroup({
        members: MEMBERS,
        expenses: [{ amount: 10000, payer: 'Ana', among: MEMBERS }],
      })
    ).map((t) => ({
      from: t.fromId,
      to: t.toId,
      amount: t.amount,
      createdAt: '2026-01-01T11:00:00.000Z',
    })),
  });
  expect(computeBalances(group).every((b) => b.balance === 0)).toBe(true);
  const next = removeExpense(group, 'e1');
  if (!next.ok) throw new Error('unexpected');
  return previewBalanceChange(group, next.value);
}

test('eliminar un gasto ya pagado advierte, se puede cancelar, confirmar y deshacer', async ({
  page,
}) => {
  await createGroup(page);
  await addExpense(page, 'Supermercado', 10000);
  await settleEverything(page);

  const changes = expectedChanges();
  expect(changes[0]).toEqual({ memberId: 'Ana', before: 0, after: -6666 });

  await page.getByRole('button', { name: /Supermercado/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  const warning = page.getByRole('alertdialog', {
    name: 'Este gasto ya se consideró en pagos registrados',
  });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('Si lo eliminas, los saldos cambian:');
  for (const c of changes) {
    await expect(warning).toContainText(
      `${c.memberId}: ${words(c.before)} → ${words(c.after)}`
    );
  }
  await expect(warning).toContainText('Ana: Al día → Debe $6.666');
  // Cancel is the default focus and the confirmation is the red button.
  await expect(warning.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  // Cancel: nothing changes, focus returns to the delete button.
  await warning.getByRole('button', { name: 'Cancelar' }).click();
  await expect(warning).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Eliminar gasto' })
  ).toBeFocused();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await tab(page, 'Saldos').click();
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
  await tab(page, 'Gastos').click();

  // Confirm: balances change.
  await page.getByRole('button', { name: /Supermercado/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  await warning
    .getByRole('button', { name: 'Eliminar de todas formas' })
    .click();
  await expect(page.getByText('Gasto eliminado')).toBeVisible();
  await tab(page, 'Saldos').click();
  await expect(page.getByText('¡Están al día! 🎉')).toBeHidden();
  await expect(page.getByText(words(-6666)).first()).toBeVisible();

  // Undo: back to settled.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Cambio deshecho')).toBeVisible();
  await expect(page.getByText('¡Están al día! 🎉')).toBeVisible();
});

test('agregar un gasto nuevo después de los pagos no muestra advertencia', async ({
  page,
}) => {
  await createGroup(page);
  await addExpense(page, 'Supermercado', 10000);
  await settleEverything(page);
  await addExpense(page, 'Taxi', 3000);

  await page.getByRole('button', { name: /Taxi/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Gasto eliminado')).toBeVisible();
});

test('el toast queda abajo y no tapa el botón "Agregar gasto"', async ({
  page,
}) => {
  await createGroup(page);
  await addExpense(page, 'Supermercado', 10000);
  await addExpense(page, 'Taxi', 3000);

  await page.getByRole('button', { name: /Taxi/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  const toast = page.locator('[data-sonner-toast]', {
    hasText: 'Gasto eliminado',
  });
  await expect(toast).toHaveAttribute('data-mounted', 'true');
  await expect(toast.getByRole('button', { name: 'Deshacer' })).toBeVisible();
  // Let the entrance animation finish.
  await page.waitForTimeout(500);

  const viewport = page.viewportSize()!;
  const toastBox = (await toast.boundingBox())!;
  const addBox = (await page
    .getByRole('button', { name: 'Agregar gasto' })
    .boundingBox())!;
  expect(toastBox.y).toBeGreaterThan(viewport.height / 2);
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(viewport.height);
  // Centered horizontally.
  expect(
    Math.abs(toastBox.x + toastBox.width / 2 - viewport.width / 2)
  ).toBeLessThan(2);
  const overlaps =
    toastBox.x < addBox.x + addBox.width &&
    addBox.x < toastBox.x + toastBox.width &&
    toastBox.y < addBox.y + addBox.height &&
    addBox.y < toastBox.y + toastBox.height;
  expect(overlaps).toBe(false);
});

test('con un sheet abierto el toast no tapa sus botones y "Deshacer" sigue usable', async ({
  page,
}) => {
  await createGroup(page);
  await addExpense(page, 'Supermercado', 10000);
  await addExpense(page, 'Taxi', 3000);

  await page.getByRole('button', { name: /Taxi/ }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  const toast = page.locator('[data-sonner-toast]', {
    hasText: 'Gasto eliminado',
  });
  await expect(toast).toHaveAttribute('data-mounted', 'true');

  // Opening another expense while the toast is still on screen.
  await page.getByRole('button', { name: /Supermercado/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar gasto' });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(700);

  const toastBox = (await toast.boundingBox())!;
  for (const name of ['Guardar', 'Cancelar', 'Eliminar gasto']) {
    const box = (await dialog.getByRole('button', { name }).boundingBox())!;
    const overlaps =
      toastBox.x < box.x + box.width &&
      box.x < toastBox.x + toastBox.width &&
      toastBox.y < box.y + box.height &&
      box.y < toastBox.y + toastBox.height;
    expect(overlaps, `el toast tapa "${name}"`).toBe(false);
  }

  await toast.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Cambio deshecho')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar' })).toBeVisible();
});
