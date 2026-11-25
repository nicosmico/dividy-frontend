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
      await screen.findByText(
        'No se pudo deshacer porque el grupo cambió. Revisa los cambios y corrígelos a mano.'
      )
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.members).toHaveLength(3);
  });

  describe('eliminar a quien tiene movimientos', () => {
    async function openDialog(
      user: ReturnType<typeof renderWithProviders>['user'],
      name = 'Beto'
    ) {
      await user.click(
        await screen.findByRole('button', { name: `Eliminar a ${name}` })
      );
      return screen.findByRole('dialog', { name: `Eliminar a ${name}` });
    }

    it('explica lo que pasa y cómo cambian las cuentas, sin elegir nada', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithActivity()],
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog).getByText(
          'Su parte en 1 gasto se reparte entre los demás. Se borran los 2 gastos que pagó y su pago.'
        )
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('radio')).toBeNull();
      expect(within(dialog).queryByRole('combobox')).toBeNull();
      expect(within(dialog).getByText('Así cambian las cuentas')).toBeVisible();
      expect(
        within(dialog)
          .getAllByRole('listitem')
          .map((li) => li.textContent)
      ).toEqual([
        'Ana: le deben $6.000 → $4.500',
        'Caro: debe $5.000 → $4.500',
      ]);
      const warning = within(dialog).getByText(
        'Si Beto sí participó en estos gastos, mejor no lo elimines.'
      );
      expect(warning).toHaveClass('text-muted-foreground');
      expect(
        within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
      ).toBeEnabled();
      expect(
        within(dialog).getByRole('button', { name: 'Cancelar' })
      ).toBeInTheDocument();
      expect(within(dialog).queryByText(/divididos por partes/)).toBeNull();
    });

    it('elimina, reparte su parte y se puede deshacer', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithActivity()],
      });
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      let group = await repository.get('g1');
      expect(group?.members.map((m) => m.id)).toEqual(['Ana', 'Caro', 'Dani']);
      expect(
        group?.expenses.map((e) => [e.id, e.split.participantIds])
      ).toEqual([['e1', ['Ana', 'Caro']]]);
      expect(group?.payments).toEqual([]);

      await user.click(await screen.findByRole('button', { name: 'Deshacer' }));
      expect(await screen.findByText('Cambio deshecho')).toBeInTheDocument();
      group = await repository.get('g1');
      expect(group?.members.map((m) => m.id)).toEqual([
        'Ana',
        'Beto',
        'Caro',
        'Dani',
      ]);
      expect(group?.expenses).toHaveLength(3);
      expect(group?.payments).toHaveLength(1);
    });

    it('cancelar no cambia nada', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [groupWithActivity()],
      });
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole('button', { name: 'Cancelar' })
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      expect((await repository.get('g1'))?.members).toHaveLength(4);
    });

    it('omite lo que es 0 y respeta el plural', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          { id: 'e1', amount: 9000, payer: 'Ana', among: ['Ana', 'Beto'] },
          { id: 'e2', amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] },
        ],
      });
      const { user } = renderWithProviders(undefined, {
        route: `/groups/${group.id}/members`,
        groups: [group],
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog).getByText(
          'Su parte en 2 gastos se reparte entre los demás.'
        )
      ).toBeInTheDocument();
      expect(within(dialog).queryByText(/Se borra/)).toBeNull();
    });

    it('con solo gastos pagados y varios pagos no habla de repartir', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto', 'Caro'],
        expenses: [
          { id: 'e1', amount: 9000, payer: 'Beto', among: ['Ana', 'Caro'] },
        ],
        payments: [
          { id: 'p1', from: 'Ana', to: 'Beto', amount: 100 },
          { id: 'p2', from: 'Beto', to: 'Caro', amount: 200 },
        ],
      });
      const { user } = renderWithProviders(undefined, {
        route: `/groups/${group.id}/members`,
        groups: [group],
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog).getByText('Se borran el gasto que pagó y sus 2 pagos.')
      ).toBeInTheDocument();
      expect(within(dialog).queryByText(/se reparte/)).toBeNull();
    });

    it('un solo pago se borra en singular, y un gasto donde participaba solo también se avisa', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [{ id: 'e1', amount: 900, payer: 'Ana', among: ['Beto'] }],
        payments: [{ id: 'p1', from: 'Ana', to: 'Beto', amount: 100 }],
      });
      const { user, repository } = renderWithProviders(undefined, {
        route: `/groups/${group.id}/members`,
        groups: [group],
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog).getByText(
          'Se borra su pago. También se borra 1 gasto en que solo participaba Beto.'
        )
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
      );
      await waitFor(async () =>
        expect((await repository.get(group.id))?.expenses).toEqual([])
      );
    });

    it('escribe "(tú)" junto a quien eres y usa la moneda del grupo', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto', 'Caro'],
        currency: 'USD',
        expenses: [
          {
            id: 'e1',
            amount: 3000,
            payer: 'Ana',
            among: ['Ana', 'Beto', 'Caro'],
          },
        ],
      });
      const { user } = renderWithProviders(undefined, {
        route: `/groups/${group.id}/members`,
        groups: [group],
        viewers: { 'group:g1': { memberId: 'Caro' } },
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog)
          .getAllByRole('listitem')
          .map((li) => li.textContent)
      ).toEqual([
        'Ana: le deben US$20,00 → US$15,00',
        'Caro (tú): debe US$10,00 → US$15,00',
      ]);
    });

    it('si queda al día, muestra los dos saldos completos', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          { id: 'e1', amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] },
        ],
      });
      const { user } = renderWithProviders(undefined, {
        route: `/groups/${group.id}/members`,
        groups: [group],
      });
      const dialog = await openDialog(user);
      expect(
        within(dialog)
          .getAllByRole('listitem')
          .map((li) => li.textContent)
      ).toEqual(['Ana: le deben $500 → al día']);
    });

    describe('con divisiones por partes', () => {
      const group = makeGroup({
        members: ['Ana', 'Beto', 'Caro'],
        expenses: [
          {
            id: 'e1',
            description: 'Cabaña',
            amount: 100_000,
            payer: 'Ana',
            among: ['Ana', 'Beto', 'Caro'],
            split: {
              type: 'shares',
              participantIds: ['Ana', 'Beto', 'Caro'],
              parts: { Ana: 2, Beto: 1, Caro: 1 },
            },
          },
          {
            id: 'e2',
            description: 'Cena',
            amount: 90_000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
            split: {
              type: 'exact',
              participantIds: ['Ana', 'Beto'],
              amounts: { Ana: 50_000, Beto: 40_000 },
            },
          },
        ],
      });

      it('avisa que pasan a montos y lo hace', async () => {
        const { user, repository } = renderWithProviders(undefined, {
          route: ROUTE,
          groups: [group],
        });
        const dialog = await openDialog(user);
        expect(
          within(dialog).getByText(
            'Los gastos divididos por partes pasan a montos.'
          )
        ).toBeInTheDocument();
        await user.click(
          within(dialog).getByRole('button', { name: 'Eliminar a Beto' })
        );
        await waitFor(() =>
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        );
        const saved = await repository.get('g1');
        expect(saved?.expenses.map((e) => e.split)).toEqual([
          {
            type: 'exact',
            participantIds: ['Ana', 'Caro'],
            amounts: { Ana: 62_500, Caro: 37_500 },
          },
          { type: 'exact', participantIds: ['Ana'], amounts: { Ana: 90_000 } },
        ]);
      });

      it('sin gastos por partes no avisa nada', async () => {
        const { user } = renderWithProviders(undefined, {
          route: ROUTE,
          groups: [groupWithActivity()],
        });
        const dialog = await openDialog(user);
        expect(within(dialog).queryByText(/por partes/)).toBeNull();
      });
    });
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
