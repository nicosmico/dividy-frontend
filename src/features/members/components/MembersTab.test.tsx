import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/members';

/** Ana pays 9000 for the three; Beto pays 3000 for himself and Caro; Caro paid Beto 500. */
function groupWithActivity() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Caro', 'Dani'],
    expenses: [
      {
        id: 'e1',
        description: 'Asado',
        amount: 9000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Caro'],
      },
      {
        id: 'e2',
        description: 'Bebidas',
        amount: 3000,
        payer: 'Beto',
        among: ['Beto', 'Caro'],
      },
      {
        id: 'e3',
        description: 'Pan',
        amount: 1000,
        payer: 'Beto',
        among: ['Caro'],
      },
    ],
    payments: [{ id: 'p1', from: 'Caro', to: 'Beto', amount: 500 }],
  });
}

describe('Pestaña Miembros', () => {
  it('lista los miembros con avatar y nombre', async () => {
    renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    expect(await screen.findByText('2 miembros')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Cambiar avatar de Ana' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cambiar avatar de Beto' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelectorAll('img[data-avatar-color]')).toHaveLength(
        2
      )
    );
    expect(
      [...document.querySelectorAll('[data-avatar-color]')].map((el) =>
        el.getAttribute('data-avatar-color')
      )
    ).toEqual(['0', '1']);
  });

  it('agrega un miembro y valida duplicados', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    const input = await screen.findByLabelText('Nombre');
    await user.type(input, 'beto');
    await user.click(screen.getByRole('button', { name: /Agregar/ }));
    expect(
      await screen.findByText(
        'Ya hay alguien llamado "Beto" en el grupo. Usa otro nombre.'
      )
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Caro');
    await user.click(screen.getByRole('button', { name: /Agregar/ }));
    expect(await screen.findByText('3 miembros')).toBeInTheDocument();
    const group = await repository.get('g1');
    expect(group?.members.map((m) => m.name)).toEqual(['Ana', 'Beto', 'Caro']);
    expect(group?.members[2].id).toBe('id1');
  });

  it('tocar la carita da otra cara al instante, con el mismo color, y se puede deshacer', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    const button = await screen.findByRole('button', {
      name: 'Cambiar avatar de Beto',
    });
    expect(button).toHaveClass('size-11');
    await user.click(button);

    expect(await screen.findByText('Cara nueva para Beto')).toBeInTheDocument();
    let group = await repository.get('g1');
    expect(group?.members[1].avatar).toEqual({ color: 1, seed: 'id1' });
    expect(group?.members[0].avatar).toEqual({ color: 0, seed: 'Ana' });

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Cambio deshecho')).toBeInTheDocument();
    group = await repository.get('g1');
    expect(group?.members[1].avatar).toEqual({ color: 1, seed: 'Beto' });
  });

  it('en el diálogo, la cara nueva es una vista previa: Guardar la persiste', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Editar a Ana' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Editar miembro',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Generar otra cara' })
    );
    expect((await repository.get('g1'))?.members[0].avatar.seed).toBe('Ana');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect((await repository.get('g1'))?.members[0].avatar).toEqual({
      color: 0,
      seed: 'id1',
    });
  });

  it('en el diálogo, Cancelar descarta la cara nueva', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Editar a Ana' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Editar miembro',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Generar otra cara' })
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect((await repository.get('g1'))?.members[0].avatar.seed).toBe('Ana');
  });

  it('edita el nombre de un miembro', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Editar a Ana' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Editar miembro',
    });
    const input = within(dialog).getByLabelText('Nombre');
    expect(input).toHaveValue('Ana');

    await user.clear(input);
    await user.type(input, 'Beto');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText(
        'Ya hay alguien llamado "Beto" en el grupo. Usa otro nombre.'
      )
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Anita');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(await screen.findByText('Anita')).toBeInTheDocument();
    const group = await repository.get('g1');
    expect(group?.members[0]).toEqual({
      id: 'Ana',
      name: 'Anita',
      avatar: { color: 0, seed: 'Ana' },
    });
  });

  it('elimina directo, sin confirmar, a un miembro sin movimientos', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Dani' })
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(
      await screen.findByText('Dani fue eliminado del grupo')
    ).toBeInTheDocument();
    expect(await screen.findByText('3 miembros')).toBeInTheDocument();
    const group = await repository.get('g1');
    expect(group?.members.map((m) => m.name)).toEqual(['Ana', 'Beto', 'Caro']);
    expect(group?.expenses).toHaveLength(3);
  });

  it('deshace la eliminación de un miembro desde el toast', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Dani' })
    );
    await screen.findByText('Dani fue eliminado del grupo');
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(await screen.findByText('Cambio deshecho')).toBeInTheDocument();
    expect(await screen.findByText('4 miembros')).toBeInTheDocument();
    expect((await repository.get('g1'))?.members.map((m) => m.name)).toEqual([
      'Ana',
      'Beto',
      'Caro',
      'Dani',
    ]);
  });

  it('no deshace si el grupo cambió desde la eliminación y lo avisa', async () => {
    let tick = 0;
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
      now: () => new Date(Date.UTC(2026, 4, 1, 10, ++tick)).toISOString(),
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Dani' })
    );
    await screen.findByText('Dani fue eliminado del grupo');
    // Someone else changes the group before the user presses "Deshacer".
    const current = (await repository.get('g1'))!;
    await repository.save({
      ...current,
      updatedAt: '2030-01-01T00:00:00.000Z',
    });
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(
      await screen.findByText('No se pudo deshacer porque el grupo cambió.')
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.members).toHaveLength(3);
  });

  it('con movimientos muestra la vista previa y no permite confirmar sin elegir', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Beto' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Eliminar a Beto',
    });
    expect(within(dialog).getByText('Pagó 2 gastos')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Participa en 2 gastos')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Tiene 1 pago enviado o recibido')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
    ).toBeDisabled();
  });

  it('reasigna sus movimientos a otro miembro', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Beto' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Eliminar a Beto',
    });
    await user.click(
      within(dialog).getByRole('radio', { name: 'Reasignar a…' })
    );
    const confirm = within(dialog).getByRole('button', {
      name: 'Eliminar a Beto',
    });
    expect(confirm).toBeDisabled();

    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Ana' }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    const group = await repository.get('g1');
    expect(group?.members.map((m) => m.id)).toEqual(['Ana', 'Caro', 'Dani']);
    expect(
      group?.expenses.map((e) => [e.id, e.payerId, e.split.participantIds])
    ).toEqual([
      ['e1', 'Ana', ['Ana', 'Caro']],
      ['e2', 'Ana', ['Ana', 'Caro']],
      ['e3', 'Ana', ['Caro']],
    ]);
    expect(group?.payments).toEqual([
      expect.objectContaining({ id: 'p1', fromId: 'Caro', toId: 'Ana' }),
    ]);
    expect(group?.updatedAt).toBe('2026-05-01T10:00:00.000Z');
  });

  it('elimina con sus gastos y explica qué se borra', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [groupWithActivity()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar a Beto' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Eliminar a Beto',
    });
    await user.click(
      within(dialog).getByRole('radio', { name: 'Eliminar con sus gastos' })
    );
    expect(
      within(dialog).getByText('Se borrarán 2 gastos:')
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Bebidas ($3.000)')).toBeInTheDocument();
    expect(within(dialog).getByText('Pan ($1.000)')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/También se borrará 1 pago/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/las partes de los demás cambian/)
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    const group = await repository.get('g1');
    expect(group?.members.map((m) => m.id)).toEqual(['Ana', 'Caro', 'Dani']);
    expect(group?.expenses.map((e) => [e.id, e.split.participantIds])).toEqual([
      ['e1', ['Ana', 'Caro']],
    ]);
    expect(group?.payments).toEqual([]);
  });

  it('muestra el error del dominio si la eliminación no es válida y no guarda', async () => {
    // The screen thinks Beto has no activity, but he got an expense meanwhile.
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    const button = await screen.findByRole('button', {
      name: 'Eliminar a Beto',
    });
    await repository.save({
      ...makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [{ amount: 100, payer: 'Beto', among: ['Ana', 'Beto'] }],
      }),
    });
    await user.click(button);
    expect(await screen.findByText(/tiene gastos o pagos/)).toBeInTheDocument();
    expect((await repository.get('g1'))?.members).toHaveLength(2);
    expect(currentPath()).toBe(ROUTE);
  });
});
