import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

const ROUTE = '/groups/g1/expenses';

const threeMembers = () => makeGroup({ members: ['Ana', 'Beto', 'Caro'] });

type User = ReturnType<typeof renderWithProviders>['user'];

async function openNewForm(user: User) {
  await user.click(
    await screen.findByRole('button', { name: /Agregar gasto/ })
  );
  return screen.findByRole('dialog', { name: 'Nuevo gasto' });
}

/** Opens the form with an amount typed and the given mode chosen. */
async function formIn(
  user: User,
  mode: 'Iguales' | 'Montos' | '%' | 'Partes',
  amount = '100000'
) {
  const dialog = await openNewForm(user);
  await user.type(within(dialog).getByLabelText('Descripción'), 'Cabaña');
  await user.type(within(dialog).getByLabelText('Monto en pesos'), amount);
  await user.click(within(dialog).getByRole('radio', { name: mode }));
  return dialog;
}

const status = (dialog: HTMLElement) =>
  dialog.querySelector<HTMLElement>('[aria-live="polite"]');

describe('control segmentado "Dividir entre"', () => {
  it('ofrece Iguales (por defecto), Montos, % y Partes', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await openNewForm(user);
    const group = within(dialog).getByRole('radiogroup', {
      name: 'Cómo se divide',
    });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent)
    ).toEqual(['Iguales', 'Montos', '%', 'Partes']);
    expect(within(group).getByRole('radio', { name: 'Iguales' })).toBeChecked();
  });

  it('con "Iguales" todo se ve como siempre: sin campos ni línea de estado', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await openNewForm(user);
    await user.type(within(dialog).getByLabelText('Monto en pesos'), '10000');
    expect(within(dialog).queryByLabelText(/^Monto de /)).toBeNull();
    expect(status(dialog)).toBeNull();
    expect(within(dialog).getByText('$3.334')).toBeInTheDocument();
  });

  it('se puede mover con las flechas del teclado', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await openNewForm(user);
    await user.click(within(dialog).getByRole('radio', { name: 'Iguales' }));
    // Held down: Radix moves focus on a timer and checks it only while the arrow is down.
    await user.keyboard('{ArrowRight>}');
    await waitFor(() =>
      expect(
        within(dialog).getByRole('radio', { name: 'Montos' })
      ).toBeChecked()
    );
  });
});

describe('Montos', () => {
  it('precarga las partes iguales de hoy, que ya cuadran', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    expect(within(dialog).getByLabelText('Monto de Ana')).toHaveValue('33.334');
    expect(within(dialog).getByLabelText('Monto de Beto')).toHaveValue(
      '33.333'
    );
    expect(within(dialog).getByLabelText('Monto de Caro')).toHaveValue(
      '33.333'
    );
    expect(status(dialog)).toHaveTextContent(
      'Asignado $100.000 de $100.000 · Cuadra'
    );
  });

  it('la línea de estado dice cuánto falta, cuánto te pasaste y cuándo cuadra', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    const ana = within(dialog).getByLabelText('Monto de Ana');

    await user.clear(ana);
    await user.type(ana, '23334');
    expect(status(dialog)).toHaveTextContent(
      'Asignado $90.000 de $100.000 · faltan $10.000'
    );

    await user.clear(ana);
    await user.type(ana, '43334');
    expect(status(dialog)).toHaveTextContent(
      'Asignado $110.000 de $100.000 · te pasaste por $10.000'
    );

    await user.clear(ana);
    await user.type(ana, '33334');
    expect(status(dialog)).toHaveTextContent(
      'Asignado $100.000 de $100.000 · Cuadra'
    );
  });

  it('la línea de estado es una región en vivo educada', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    expect(status(dialog)).toHaveAttribute('aria-live', 'polite');
  });

  it('muestra el valor con formato chileno al salir del campo', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '12000');
    expect(ana).toHaveValue('12000');
    await user.tab();
    expect(ana).toHaveValue('12.000');
  });

  it('el campo numérico pide teclado numérico y solo acepta números', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    expect(ana).toHaveAttribute('inputmode', 'numeric');
    await user.clear(ana);
    await user.type(ana, 'a1b2,3');
    expect(ana).toHaveValue('123');
  });

  it('no deja guardar si no cuadra, lo dice como error, y guarda al corregirlo', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '23334');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Faltan $10.000 por asignar.'
    );
    expect((await repository.get('g1'))?.expenses).toHaveLength(0);

    await user.clear(ana);
    await user.type(ana, '43334');
    await waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        'Te pasaste por $10.000.'
      )
    );

    await user.clear(ana);
    await user.type(ana, '33334');
    await waitFor(() =>
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    );
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses).toHaveLength(1)
    );
    expect((await repository.get('g1'))?.expenses[0].split).toEqual({
      type: 'exact',
      participantIds: ['Ana', 'Beto', 'Caro'],
      amounts: { Ana: 33_334, Beto: 33_333, Caro: 33_333 },
    });
  });

  it('un participante con $0 no es válido: pide quitarlo de la división', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos', '100');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Caro' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Caro' }));
    expect(within(dialog).getByLabelText('Monto de Caro')).toHaveValue('0');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '67');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Quita de la división a Caro, que tiene $0, o asígnale un monto.'
    );
  });

  it('desmarcar a alguien quita su campo y marcarlo lo agrega con 0', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Beto' }));
    expect(within(dialog).queryByLabelText('Monto de Beto')).toBeNull();
    // Its $33.333 is not assigned anymore.
    expect(status(dialog)).toHaveTextContent(
      'Asignado $66.667 de $100.000 · faltan $33.333'
    );
    await user.click(within(dialog).getByRole('checkbox', { name: 'Beto' }));
    expect(within(dialog).getByLabelText('Monto de Beto')).toHaveValue('0');
  });

  it('cambiar de modo vuelve a precargar valores que cuadran', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Montos');
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '1');
    await user.click(within(dialog).getByRole('radio', { name: 'Iguales' }));
    expect(within(dialog).queryByLabelText(/^Monto de /)).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: 'Montos' }));
    expect(within(dialog).getByLabelText('Monto de Ana')).toHaveValue('33.334');
  });
});

describe('Porcentaje', () => {
  it('precarga un reparto igual con el resto de centésimas a los primeros', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, '%');
    expect(within(dialog).getByLabelText('Porcentaje de Ana')).toHaveValue(
      '33,34'
    );
    expect(within(dialog).getByLabelText('Porcentaje de Beto')).toHaveValue(
      '33,33'
    );
    expect(within(dialog).getByLabelText('Porcentaje de Ana')).toHaveAttribute(
      'inputmode',
      'decimal'
    );
    expect(status(dialog)).toHaveTextContent('100 %');
  });

  it('dice cuánto falta o te pasaste, acepta la coma y guarda en puntos básicos', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    const dialog = await formIn(user, '%', '1000');
    const ana = within(dialog).getByLabelText('Porcentaje de Ana');
    const beto = within(dialog).getByLabelText('Porcentaje de Beto');

    await user.clear(ana);
    await user.type(ana, '45');
    expect(status(dialog)).toHaveTextContent('Suma 95 % · faltan 5 %');
    await user.clear(ana);
    await user.type(ana, '55');
    expect(status(dialog)).toHaveTextContent('Suma 105 % · te pasaste por 5 %');

    await user.clear(ana);
    await user.type(ana, '12,5');
    await user.clear(beto);
    await user.type(beto, '87,5');
    await user.tab();
    expect(status(dialog)).toHaveTextContent('100 %');
    expect(ana).toHaveValue('12,5');

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses).toHaveLength(1)
    );
    expect((await repository.get('g1'))?.expenses[0].split).toEqual({
      type: 'percent',
      participantIds: ['Ana', 'Beto'],
      basisPoints: { Ana: 1250, Beto: 8750 },
    });
  });

  it('no deja guardar si no suman 100 %', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [makeGroup({ members: ['Ana', 'Beto'] })],
    });
    const dialog = await formIn(user, '%');
    const ana = within(dialog).getByLabelText('Porcentaje de Ana');
    await user.clear(ana);
    await user.type(ana, '45');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Los porcentajes suman 95 %; deben sumar 100 %.'
    );
    expect((await repository.get('g1'))?.expenses).toHaveLength(0);
  });
});

describe('Partes', () => {
  it('precarga 1 parte cada uno y muestra el monto resultante en vivo', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Partes');
    expect(within(dialog).getByLabelText('Partes de Ana')).toHaveValue('1');
    expect(within(dialog).getByText('1 parte · $33.334')).toBeInTheDocument();
    expect(status(dialog)).toHaveTextContent('3 partes en total');

    const ana = within(dialog).getByLabelText('Partes de Ana');
    await user.clear(ana);
    await user.type(ana, '2');
    expect(within(dialog).getByText('2 partes · $50.000')).toBeInTheDocument();
    expect(within(dialog).getAllByText('1 parte · $25.000')).toHaveLength(2);
    expect(status(dialog)).toHaveTextContent('4 partes en total');
  });

  it('un participante marcado de nuevo empieza con 1 parte; el monto se recalcula solo al cambiar el monto del gasto', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Partes', '90000');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Caro' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Caro' }));
    expect(within(dialog).getByLabelText('Partes de Caro')).toHaveValue('1');
    await user.type(within(dialog).getByLabelText('Monto en pesos'), '0');
    expect(within(dialog).getAllByText('1 parte · $300.000')).toHaveLength(3);
  });

  it('guarda las partes y la parte 0 no es válida', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [threeMembers()],
    });
    const dialog = await formIn(user, 'Partes', '150000');
    const ana = within(dialog).getByLabelText('Partes de Ana');
    await user.clear(ana);
    await user.type(ana, '0');
    expect(status(dialog)).toHaveTextContent('Cada parte debe ser al menos 1.');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Cada parte debe ser al menos 1.'
    );

    await user.clear(ana);
    await user.type(ana, '2');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses).toHaveLength(1)
    );
    expect((await repository.get('g1'))?.expenses[0].split).toEqual({
      type: 'shares',
      participantIds: ['Ana', 'Beto', 'Caro'],
      parts: { Ana: 2, Beto: 1, Caro: 1 },
    });
  });
});

describe('editar un gasto con división personalizada', () => {
  const withExact = () =>
    makeGroup({
      members: ['Ana', 'Beto', 'Caro'],
      expenses: [
        {
          id: 'e1',
          description: 'Cabaña',
          amount: 100_000,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
          split: {
            type: 'exact',
            participantIds: ['Ana', 'Beto'],
            amounts: { Ana: 70_000, Beto: 30_000 },
          },
          date: '2026-03-10',
        },
        {
          id: 'e2',
          description: 'Cena',
          amount: 40_000,
          payer: 'Beto',
          among: ['Ana', 'Beto', 'Caro'],
          split: {
            type: 'shares',
            participantIds: ['Ana', 'Beto', 'Caro'],
            parts: { Ana: 2, Beto: 1, Caro: 1 },
          },
          date: '2026-03-09',
        },
      ],
    });

  it('abre con el modo y los valores guardados', async () => {
    const { user } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [withExact()],
    });
    await user.click(await screen.findByRole('button', { name: /Cabaña/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar gasto' });
    expect(within(dialog).getByRole('radio', { name: 'Montos' })).toBeChecked();
    expect(within(dialog).getByLabelText('Monto de Ana')).toHaveValue('70.000');
    expect(within(dialog).getByLabelText('Monto de Beto')).toHaveValue(
      '30.000'
    );
    expect(within(dialog).queryByLabelText('Monto de Caro')).toBeNull();
    expect(status(dialog)).toHaveTextContent('· Cuadra');
  });

  it('editar el monto de un gasto por montos deja de cuadrar y no deja guardar', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [withExact()],
    });
    await user.click(await screen.findByRole('button', { name: /Cabaña/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar gasto' });
    const amount = within(dialog).getByLabelText('Monto en pesos');
    await user.clear(amount);
    await user.type(amount, '120000');
    expect(status(dialog)).toHaveTextContent(
      'Asignado $100.000 de $120.000 · faltan $20.000'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Faltan $20.000 por asignar.'
    );
    expect((await repository.get('g1'))?.expenses[0].amount).toBe(100_000);

    // Fixing Ana's amount lets it save.
    const ana = within(dialog).getByLabelText('Monto de Ana');
    await user.clear(ana);
    await user.type(ana, '90000');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses[0].amount).toBe(120_000)
    );
  });

  it('editar el monto de un gasto por partes recalcula solo', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: ROUTE,
      groups: [withExact()],
    });
    await user.click(await screen.findByRole('button', { name: /Cena/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar gasto' });
    const amount = within(dialog).getByLabelText('Monto en pesos');
    await user.clear(amount);
    await user.type(amount, '80000');
    expect(within(dialog).getByText('2 partes · $40.000')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await repository.get('g1'))?.expenses[1].amount).toBe(80_000)
    );
  });
});

describe('lista de gastos con división personalizada', () => {
  it('dice "dividido por montos / porcentaje / partes"', async () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        {
          id: 'e1',
          description: 'Uno',
          amount: 100,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
          split: {
            type: 'exact',
            participantIds: ['Ana', 'Beto'],
            amounts: { Ana: 60, Beto: 40 },
          },
        },
        {
          id: 'e2',
          description: 'Dos',
          amount: 100,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
          split: {
            type: 'percent',
            participantIds: ['Ana', 'Beto'],
            basisPoints: { Ana: 6000, Beto: 4000 },
          },
        },
        {
          id: 'e3',
          description: 'Tres',
          amount: 100,
          payer: 'Ana',
          among: ['Ana'],
          split: {
            type: 'shares',
            participantIds: ['Ana'],
            parts: { Ana: 3 },
          },
        },
        {
          id: 'e4',
          description: 'Cuatro',
          amount: 100,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
        },
      ],
    });
    renderWithProviders(undefined, { route: ROUTE, groups: [group] });
    expect(
      await screen.findByRole('button', { name: /Uno/ })
    ).toHaveTextContent('Pagó Ana · dividido por montos');
    expect(screen.getByRole('button', { name: /Dos/ })).toHaveTextContent(
      'Pagó Ana · dividido por porcentaje'
    );
    expect(screen.getByRole('button', { name: /Tres/ })).toHaveTextContent(
      'Pagó Ana · dividido por partes'
    );
    expect(screen.getByRole('button', { name: /Cuatro/ })).toHaveTextContent(
      'Pagó Ana · dividido entre todos'
    );
  });
});
