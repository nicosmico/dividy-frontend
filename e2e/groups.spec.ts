import { expect, test } from '@playwright/test';

test('crear grupo, administrar miembros, persistir tras recargar y eliminar el grupo', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Dividy');
  await expect(
    page.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toBeVisible();
  await expect(page.getByText('Solo pesos chilenos.')).toBeVisible();

  // Create a group with 3 members.
  await page.getByRole('link', { name: 'Crear mi primer grupo' }).click();
  await expect(page).toHaveURL(/\/groups\/new$/);
  const newGroupIcons = page.locator('[data-slot="entity-icon"] svg');
  await expect(newGroupIcons.first()).toHaveClass(/lucide-users/);
  await page.getByLabel('Nombre del grupo').fill('Viaje a Pucón');
  await expect(newGroupIcons.first()).toHaveClass(/lucide-plane/);
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const name of ['Ana', 'Beto', 'Caro']) {
    await memberInput.fill(name);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();

  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
  await expect(
    page.getByRole('heading', { name: 'Viaje a Pucón', level: 1 })
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="entity-icon"] svg.lucide-plane')
  ).toBeVisible();

  // It appears in "Mis grupos".
  await page.getByRole('link', { name: 'Dividy' }).click();
  await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Viaje a Pucón/ })).toContainText(
    '3 miembros'
  );
  await expect(
    page
      .getByRole('link', { name: /Viaje a Pucón/ })
      .locator('svg.lucide-plane')
  ).toBeVisible();
  await page.getByRole('link', { name: /Viaje a Pucón/ }).click();

  // Rename a member.
  await page
    .getByRole('navigation', { name: 'Secciones del grupo' })
    .getByRole('link', { name: 'Miembros' })
    .click();
  await expect(page).toHaveURL(/\/members$/);
  await page.getByRole('button', { name: 'Editar a Beto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar miembro' });
  await dialog.getByLabel('Nombre').fill('Benjamín');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Benjamín', { exact: true })).toBeVisible();

  // Remove a member without activity.
  await page.getByRole('button', { name: 'Eliminar a Caro' }).click();
  await expect(page.getByText('2 miembros')).toBeVisible();
  // ...which can be undone from the toast, and removed again.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('3 miembros')).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar a Caro' }).click();
  await expect(page.getByText('2 miembros')).toBeVisible();
  await expect(page.getByText('Caro', { exact: true })).toHaveCount(0);

  // Data survives a reload.
  await page.reload();
  await expect(page.getByText('2 miembros')).toBeVisible();
  await expect(page.getByText('Benjamín', { exact: true })).toBeVisible();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();

  // Delete the group.
  await page.getByRole('button', { name: 'Opciones del grupo' }).click();
  await page.getByRole('menuitem', { name: /Eliminar grupo/ }).click();
  await expect(
    page.getByRole('alertdialog').getByText('¿Eliminar "Viaje a Pucón"?')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar grupo' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Divide gastos sin enredos' })
  ).toBeVisible();
});

test('un grupo inexistente muestra "Grupo no encontrado" y una ruta inválida, la 404', async ({
  page,
}) => {
  await page.goto('/groups/no-existe/expenses');
  await expect(
    page.getByRole('heading', { name: 'Grupo no encontrado' })
  ).toBeVisible();
  await page.goto('/ruta/que/no/existe');
  await expect(
    page.getByRole('heading', { name: 'Página no encontrada' })
  ).toBeVisible();
});
