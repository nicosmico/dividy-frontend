import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/expenses';
const EARLY = '2026-04-01T10:00:00.000Z';
const LATE = '2026-04-02T10:00:00.000Z';

/** Ana paid $9.000 among three; Beto and Caro already paid her $3.000 each. */
function coveredGroup(paymentsAt = LATE) {
  return makeGroup({
    members: ['Ana', 'Beto', 'Caro'],
    expenses: [
      {
        id: 'e1',
        description: 'Asado',
        amount: 9000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Caro'],
        date: '2026-03-10',
        createdAt: EARLY,
      },
    ],
    payments: [
      { from: 'Beto', to: 'Ana', amount: 3000, createdAt: paymentsAt },
      { from: 'Caro', to: 'Ana', amount: 3000, createdAt: paymentsAt },
    ],
  });
}

async function openExpense(
  user: ReturnType<typeof renderWithProviders>['user']
) {
  await user.click(await screen.findByRole('button', { name: /Asado/ }));
  return screen.findByRole('dialog', { name: 'Editar gasto' });
}

describe('Aviso de gasto ya saldado', () => {
  it('al eliminar muestra la vista previa con los saldos antes y después', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    await openExpense(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar gasto' }));

    const alert = await screen.findByRole('alertdialog', {
      name: 'Este gasto ya se consideró en pagos registrados',
    });
    expect(
      within(alert).getByText('Si lo eliminas, los saldos cambian:')
    ).toBeVisible();
    expect(within(alert).getByText('Ana: Al día → Debe $6.000')).toBeVisible();
    expect(
      within(alert).getByText('Beto: Al día → Le deben $3.000')
    ).toBeVisible();
    expect(
      within(alert).getByText('Caro: Al día → Le deben $3.000')
    ).toBeVisible();
    // Nothing is applied yet.
    expect((await repository.get('g1'))?.expenses).toHaveLength(1);
    // Safe default: Cancel has the focus.
    expect(
      within(alert).getByRole('button', { name: 'Cancelar' })
    ).toHaveFocus();
  });

  it('"Cancelar" no cambia nada y deja el foco en el botón de eliminar', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    await openExpense(user);
    const before = await repository.get('g1');
    await user.click(screen.getByRole('button', { name: 'Eliminar gasto' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar',
      })
    );

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
    expect(screen.getByRole('dialog', { name: 'Editar gasto' })).toBeVisible();
    expect(await repository.get('g1')).toEqual(before);
    expect(screen.queryByText('Gasto eliminado')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Eliminar gasto' })
      ).toHaveFocus()
    );
  });

  it('"Eliminar de todas formas" elimina y ofrece deshacer', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    await openExpense(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar gasto' }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar de todas formas' })
    );

    expect(await screen.findByText('Gasto eliminado')).toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses).toHaveLength(0);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Cambio deshecho')).toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses).toHaveLength(1);
  });

  it('al guardar una edición que cambia saldos muestra el aviso con los montos', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    const dialog = await openExpense(user);
    const amount = within(dialog).getByLabelText('Monto en pesos');
    await user.clear(amount);
    await user.type(amount, '6000');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    const alert = await screen.findByRole('alertdialog', {
      name: 'Este gasto ya se consideró en pagos registrados',
    });
    expect(
      within(alert).getByText('Si lo guardas así, los saldos cambian:')
    ).toBeVisible();
    expect(within(alert).getByText('Ana: Al día → Debe $2.000')).toBeVisible();
    expect(
      within(alert).getByText('Beto: Al día → Le deben $1.000')
    ).toBeVisible();
    expect((await repository.get('g1'))?.expenses[0].amount).toBe(9000);

    await user.click(
      within(alert).getByRole('button', { name: 'Guardar de todas formas' })
    );
    expect(await screen.findByText('Gasto actualizado')).toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses[0].amount).toBe(6000);
  });

  it('"Cancelar" al guardar mantiene el formulario abierto y no guarda', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    const dialog = await openExpense(user);
    const amount = within(dialog).getByLabelText('Monto en pesos');
    await user.clear(amount);
    await user.type(amount, '6000');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancelar',
      })
    );

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    );
    expect(screen.getByRole('dialog', { name: 'Editar gasto' })).toBeVisible();
    expect((await repository.get('g1'))?.expenses[0].amount).toBe(9000);
    // The user can still save after cancelling the warning.
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('un gasto no cubierto (pagos anteriores) no muestra el aviso', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup('2026-03-01T10:00:00.000Z')],
    });
    await openExpense(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar gasto' }));

    expect(await screen.findByText('Gasto eliminado')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses).toHaveLength(0);
  });

  it('un gasto cubierto donde solo cambia la descripción guarda sin aviso', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [coveredGroup()],
    });
    const dialog = await openExpense(user);
    const description = within(dialog).getByLabelText('Descripción');
    await user.clear(description);
    await user.type(description, 'Asado grande');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Gasto actualizado')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect((await repository.get('g1'))?.expenses[0].description).toBe(
      'Asado grande'
    );
  });
});
