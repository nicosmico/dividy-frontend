import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

const moodsIn = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-mood]')].map((el) =>
    el.getAttribute('data-mood')
  );

/** Ana +3.000, Beto −3.000, Carla 0. */
function pendingGroup() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [{ amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] }],
  });
}

describe('Caritas según el saldo (decisión 93)', () => {
  it('en Saldos, triste quien debe o a quien le deben y feliz quien está al día', async () => {
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [pendingGroup()],
    });
    const section = (
      await screen.findByRole('heading', { name: 'Saldo por miembro' })
    ).closest('section')!;
    expect(moodsIn(section)).toEqual(['sad', 'sad', 'happy']);
  });

  it('las dos caritas de una transferencia pendiente están tristes', async () => {
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [pendingGroup()],
    });
    const section = (
      await screen.findByRole('heading', { name: 'Para quedar al día' })
    ).closest('section')!;
    expect(moodsIn(within(section).getAllByRole('listitem')[0])).toEqual([
      'sad',
      'sad',
    ]);
  });

  it('tras saldar todo, todas las caritas quedan felices', async () => {
    const settled = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [{ amount: 6000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 3000 }],
    });
    renderWithProviders(undefined, {
      route: '/groups/g1/balances',
      groups: [settled],
    });
    const section = (
      await screen.findByRole('heading', { name: 'Saldo por miembro' })
    ).closest('section')!;
    expect(moodsIn(section)).toEqual(['happy', 'happy', 'happy']);
  });

  it('la pestaña Miembros, la lista de gastos y la tarjeta usan la misma regla', async () => {
    const group = {
      ...pendingGroup(),
      expenses: [
        {
          ...pendingGroup().expenses[0],
          description: 'Asado',
        },
      ],
    };
    const members = renderWithProviders(undefined, {
      route: '/groups/g1/members',
      groups: [group],
    });
    await screen.findByText('3 miembros');
    expect(moodsIn(members.container)).toEqual(['sad', 'sad', 'happy']);
    members.unmount();

    const expenses = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    const row = await screen.findByRole('button', { name: /Asado/ });
    expect(moodsIn(row)).toEqual(['sad']); // Ana, quien pagó, tiene saldo pendiente
    expenses.unmount();

    const home = renderWithProviders(undefined, { groups: [group] });
    await screen.findByText('3 miembros');
    expect(moodsIn(home.container)).toEqual(['sad', 'sad', 'happy']);
  });
});
