import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';

describe('Mis grupos', () => {
  it('sin grupos muestra la bienvenida con los 3 pasos y el botón para crear', async () => {
    const { user } = renderWithProviders();
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a Dividy' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.getByText(
        'Solo pesos chilenos. Tus datos se guardan en este dispositivo.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Crear grupo' }));
    await waitFor(() => expect(currentPath()).toBe('/groups/new'));
  });

  it('lista los grupos del más reciente al más antiguo con miembros y total gastado', async () => {
    const old = {
      ...makeGroup({ members: ['Ana', 'Beto'], name: 'Casa' }),
      id: 'old',
      updatedAt: '2026-01-10T10:00:00.000Z',
    };
    const recent = {
      ...makeGroup({
        members: ['Ana', 'Beto', 'Caro'],
        name: 'Viaje',
        expenses: [
          { amount: 12000, payer: 'Ana', among: ['Ana', 'Beto', 'Caro'] },
          { amount: 3000, payer: 'Beto', among: ['Ana', 'Beto'] },
        ],
      }),
      id: 'recent',
      updatedAt: '2026-04-20T10:00:00.000Z',
    };
    const { user } = renderWithProviders(undefined, { groups: [old, recent] });

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByRole('heading', { name: 'Viaje' })
    ).toBeInTheDocument();
    expect(within(items[0]).getByText('$15.000')).toBeInTheDocument();
    expect(within(items[0]).getByText('3 miembros')).toBeInTheDocument();
    expect(within(items[0]).getByText(/20 abr 2026/)).toBeInTheDocument();
    expect(within(items[0]).getByAltText('Caro')).toBeInTheDocument();
    expect(within(items[1]).getByText('$0')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Bienvenido a Dividy' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Casa/ }));
    await waitFor(() => expect(currentPath()).toBe('/groups/old/expenses'));
  });
});
