import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { todayLocal } from '@/lib/dates';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/expenses';

function oneExpense() {
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
      },
    ],
  });
}

function twoExpenses() {
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
      },
      {
        id: 'e2',
        description: 'Bencina',
        amount: 5000,
        payer: 'Beto',
        among: ['Beto', 'Caro'],
        date: '2026-03-09',
      },
    ],
  });
}

async function openNewForm(
  user: ReturnType<typeof renderWithProviders>['user']
) {
  await user.click(
    await screen.findByRole('button', { name: /Agregar gasto/ })
  );
  return screen.findByRole('dialog', { name: 'Nuevo gasto' });
}

describe('Pestaña Gastos', () => {
  describe('lista', () => {
    it('muestra el estado vacío con una explicación y el botón', async () => {
      renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      expect(await screen.findByText('Aún no hay gastos')).toBeInTheDocument();
      expect(
        screen.getByText(/Un gasto es algo que alguien pagó/)
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: /Agregar gasto/ })
      ).toBeEnabled();
    });

    it('muestra el total, la cantidad y los gastos por fecha, el más nuevo primero', async () => {
      const group = makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          {
            id: 'a',
            description: 'Viejo',
            amount: 1000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
            date: '2026-03-01',
          },
          {
            id: 'b',
            description: 'Hoy temprano',
            amount: 2000,
            payer: 'Beto',
            among: ['Beto'],
            date: todayLocal(),
          },
          {
            id: 'c',
            description: 'Medio',
            amount: 3000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
            date: '2026-03-05',
          },
        ],
      });
      group.expenses[1].createdAt = '2026-05-01T08:00:00.000Z';
      group.expenses.push({
        ...group.expenses[1],
        id: 'd',
        description: 'Hoy tarde',
        createdAt: '2026-05-01T20:00:00.000Z',
      });
      renderWithProviders(undefined, { route: ROUTE, groups: [group] });

      expect(await screen.findByText('Total del grupo')).toBeInTheDocument();
      expect(screen.getByText('$8.000')).toBeInTheDocument();
      expect(screen.getByText('4 gastos')).toBeInTheDocument();

      const rows = screen.getAllByRole('button', { name: /\$/ });
      const names = rows.map((r) => r.textContent ?? '');
      expect(names[0]).toContain('Hoy tarde');
      expect(names[1]).toContain('Hoy temprano');
      expect(names[2]).toContain('Medio');
      expect(names[3]).toContain('Viejo');
      expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
    });

    it('cada fila muestra quién pagó y entre cuántos', async () => {
      renderWithProviders(undefined, { route: ROUTE, groups: [twoExpenses()] });
      const asado = await screen.findByRole('button', { name: /Asado/ });
      expect(asado).toHaveTextContent('Pagó Ana · entre todos');
      const bencina = screen.getByRole('button', { name: /Bencina/ });
      expect(bencina).toHaveTextContent('Pagó Beto · entre 2');
    });

    it('con menos de 2 miembros deshabilita el botón y enlaza a Miembros', async () => {
      renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana'] })],
      });
      expect(
        await screen.findByRole('button', { name: /Agregar gasto/ })
      ).toBeDisabled();
      expect(screen.getByText(/necesitas al menos 2 miembros/)).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'Agregar miembros' })
      ).toHaveAttribute('href', '/groups/g1/members');
    });
  });

  describe('crear', () => {
    it('guarda exactamente un gasto con el monto entero y los valores por defecto', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto', 'Caro'] })],
      });
      const dialog = await openNewForm(user);
      await user.type(
        within(dialog).getByLabelText('Descripción'),
        'Supermercado'
      );
      await user.type(within(dialog).getByLabelText('Monto en pesos'), '10000');
      expect(within(dialog).getByLabelText('Monto en pesos')).toHaveValue(
        '10.000'
      );
      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      const group = await repository.get('g1');
      expect(group?.expenses).toHaveLength(1);
      expect(group?.expenses[0]).toMatchObject({
        description: 'Supermercado',
        amount: 10000,
        payerId: 'Ana',
        date: todayLocal(),
        split: { type: 'equal', participantIds: ['Ana', 'Beto', 'Caro'] },
      });
      expect(await screen.findByText('Gasto agregado')).toBeInTheDocument();
      expect(await screen.findByText('1 gasto')).toBeInTheDocument();
    });

    it('guarda quién pagó al cambiar "Pagado por" con el selector', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto', 'Caro'] })],
      });
      const dialog = await openNewForm(user);
      expect(within(dialog).getByLabelText('Pagado por')).toHaveTextContent(
        'Ana'
      );
      await user.type(within(dialog).getByLabelText('Descripción'), 'Bencina');
      await user.type(within(dialog).getByLabelText('Monto en pesos'), '5000');
      await user.click(within(dialog).getByLabelText('Pagado por'));
      await user.click(await screen.findByRole('option', { name: 'Caro' }));
      expect(within(dialog).getByLabelText('Pagado por')).toHaveTextContent(
        'Caro'
      );
      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

      await waitFor(async () =>
        expect((await repository.get('g1'))?.expenses).toHaveLength(1)
      );
      expect((await repository.get('g1'))?.expenses[0]).toMatchObject({
        description: 'Bencina',
        payerId: 'Caro',
        amount: 5000,
      });
    });

    it('muestra un contador de caracteres en la descripción', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      expect(within(dialog).getByText('0/80')).toBeInTheDocument();
      await user.type(
        within(dialog).getByLabelText('Descripción'),
        'Supermercado'
      );
      expect(within(dialog).getByText('12/80')).toBeInTheDocument();
    });

    it('acepta solo dígitos y cambia el separador de miles al escribir', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      const amount = within(dialog).getByLabelText('Monto en pesos');
      await user.type(amount, '1a2.3b4567');
      expect(amount).toHaveValue('1.234.567');
      await user.clear(amount);
      await user.type(amount, '0012');
      expect(amount).toHaveValue('12');
    });

    it('mantiene el cursor al editar un dígito en el medio', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      const amount = within(dialog).getByLabelText(
        'Monto en pesos'
      ) as HTMLInputElement;
      await user.type(amount, '1000');
      expect(amount).toHaveValue('1.000');
      // Put the caret after the "1" and type a 5: 1|.000 → 15|.000 → 15.000
      amount.setSelectionRange(1, 1);
      await user.keyboard('5');
      expect(amount).toHaveValue('15.000');
      expect(amount.selectionStart).toBe(2);
    });

    it('muestra los errores del dominio y no guarda', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
      expect(
        await within(dialog).findByText('La descripción no puede estar vacío.')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/El monto debe ser un número entero de pesos/)
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Descripción')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
      expect((await repository.get('g1'))?.expenses).toHaveLength(0);

      await user.click(within(dialog).getByRole('button', { name: 'Ninguno' }));
      expect(
        await within(dialog).findByText(
          'Elige al menos una persona para dividir el gasto.'
        )
      ).toBeInTheDocument();
    });

    it('muestra la parte de cada uno en vivo, con el resto y su nota', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto', 'Caro'] })],
      });
      const dialog = await openNewForm(user);
      await user.type(within(dialog).getByLabelText('Monto en pesos'), '10000');

      expect(within(dialog).getByText('$3.334')).toBeInTheDocument();
      expect(within(dialog).getAllByText('$3.333')).toHaveLength(2);
      expect(
        within(dialog).getByText('Por redondeo, a Ana le toca $1 más.')
      ).toBeInTheDocument();

      // Without Ana: 5.000 each, no remainder, no note.
      await user.click(within(dialog).getByRole('checkbox', { name: 'Ana' }));
      expect(within(dialog).getAllByText('$5.000')).toHaveLength(2);
      expect(
        within(dialog).queryByText(/Por redondeo/)
      ).not.toBeInTheDocument();
    });

    it('"Todos" y "Ninguno" marcan y desmarcan a los participantes', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      const boxes = within(dialog).getAllByRole('checkbox');
      expect(
        boxes.every((b) => b.getAttribute('aria-checked') === 'true')
      ).toBe(true);
      await user.click(within(dialog).getByRole('button', { name: 'Ninguno' }));
      expect(
        boxes.every((b) => b.getAttribute('aria-checked') === 'false')
      ).toBe(true);
      await user.click(within(dialog).getByRole('button', { name: 'Todos' }));
      expect(
        boxes.every((b) => b.getAttribute('aria-checked') === 'true')
      ).toBe(true);
    });

    it('un doble clic en Guardar guarda una sola vez (hallazgo 2)', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      await user.type(within(dialog).getByLabelText('Descripción'), 'Taxi');
      await user.type(within(dialog).getByLabelText('Monto en pesos'), '3000');
      const save = within(dialog).getByRole('button', { name: 'Guardar' });
      fireEvent.click(save);
      fireEvent.click(save);
      fireEvent.click(save);

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      expect((await repository.get('g1'))?.expenses).toHaveLength(1);
    });

    it('al cancelar no guarda nada', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [makeGroup({ members: ['Ana', 'Beto'] })],
      });
      const dialog = await openNewForm(user);
      await user.type(within(dialog).getByLabelText('Descripción'), 'Taxi');
      await user.type(within(dialog).getByLabelText('Monto en pesos'), '3000');
      await user.click(
        within(dialog).getByRole('button', { name: 'Cancelar' })
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      expect((await repository.get('g1'))?.expenses).toHaveLength(0);
    });
  });

  describe('editar y eliminar', () => {
    it('al tocar una fila el formulario muestra los valores de ese gasto', async () => {
      const { user } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [twoExpenses()],
      });
      await user.click(await screen.findByRole('button', { name: /Bencina/ }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Editar gasto',
      });
      expect(within(dialog).getByLabelText('Descripción')).toHaveValue(
        'Bencina'
      );
      expect(within(dialog).getByLabelText('Monto en pesos')).toHaveValue(
        '5.000'
      );
      expect(within(dialog).getByLabelText('Fecha')).toHaveValue('2026-03-09');
      expect(within(dialog).getByLabelText('Pagado por')).toHaveTextContent(
        'Beto'
      );
      expect(
        within(dialog).getByRole('checkbox', { name: 'Ana' })
      ).toHaveAttribute('aria-checked', 'false');
      expect(
        within(dialog).getByRole('checkbox', { name: 'Beto' })
      ).toHaveAttribute('aria-checked', 'true');
    });

    it('guarda los cambios sin duplicar el gasto y conserva su id y fecha de creación', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [oneExpense()],
      });
      await user.click(await screen.findByRole('button', { name: /Asado/ }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Editar gasto',
      });
      const description = within(dialog).getByLabelText('Descripción');
      await user.clear(description);
      await user.type(description, 'Asado grande');
      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      const group = await repository.get('g1');
      expect(group?.expenses).toHaveLength(1);
      expect(group?.expenses[0]).toMatchObject({
        id: 'e1',
        description: 'Asado grande',
        amount: 9000,
      });
      expect(await screen.findByText('Gasto actualizado')).toBeInTheDocument();
    });

    it('elimina un gasto sin confirmar y ofrece deshacer', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [oneExpense()],
      });
      await user.click(await screen.findByRole('button', { name: /Asado/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar gasto' })
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      expect((await repository.get('g1'))?.expenses).toHaveLength(0);
      expect(await screen.findByText('Gasto eliminado')).toBeInTheDocument();
      expect(await screen.findByText('Aún no hay gastos')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Deshacer' })
      ).toBeInTheDocument();
    });

    it('deshace la eliminación de un gasto desde el toast', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [oneExpense()],
      });
      await user.click(await screen.findByRole('button', { name: /Asado/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar gasto' })
      );
      await screen.findByText('Gasto eliminado');
      await user.click(screen.getByRole('button', { name: 'Deshacer' }));

      expect(await screen.findByText('Cambio deshecho')).toBeInTheDocument();
      expect(await screen.findByText('Asado')).toBeInTheDocument();
      expect((await repository.get('g1'))?.expenses).toHaveLength(1);
    });

    it('no deshace si se agregó otro gasto desde la eliminación', async () => {
      let tick = 0;
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [twoExpenses()],
        now: () => new Date(Date.UTC(2026, 4, 1, 10, ++tick)).toISOString(),
      });
      await user.click(await screen.findByRole('button', { name: /Asado/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar gasto' })
      );
      await screen.findByText('Gasto eliminado');
      const current = (await repository.get('g1'))!;
      await repository.save({
        ...current,
        updatedAt: '2030-01-01T00:00:00.000Z',
      });
      await user.click(screen.getByRole('button', { name: 'Deshacer' }));

      expect(
        await screen.findByText('No se pudo deshacer porque el grupo cambió.')
      ).toBeInTheDocument();
      expect((await repository.get('g1'))?.expenses).toHaveLength(1);
    });

    it('al eliminar el primer gasto y abrir el siguiente, muestra los datos del siguiente (hallazgo 1)', async () => {
      const { user, repository } = renderWithProviders(undefined, {
        route: ROUTE,
        groups: [twoExpenses()],
      });
      await user.click(await screen.findByRole('button', { name: /Asado/ }));
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar gasto' })
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );

      await user.click(await screen.findByRole('button', { name: /Bencina/ }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Editar gasto',
      });
      expect(within(dialog).getByLabelText('Descripción')).toHaveValue(
        'Bencina'
      );
      expect(within(dialog).getByLabelText('Monto en pesos')).toHaveValue(
        '5.000'
      );
      await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
      const saved = await repository.get('g1');
      expect(saved?.expenses).toHaveLength(1);
      expect(saved?.expenses[0]).toMatchObject({
        id: 'e2',
        description: 'Bencina',
        amount: 5000,
      });
    });
  });
});
