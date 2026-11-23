import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';

describe('Mis grupos', () => {
  it('sin grupos muestra la bienvenida animada y el botón para crear', async () => {
    const { user } = renderWithProviders();
    expect(
      await screen.findByRole('heading', { name: 'Divide gastos sin enredos' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: /Ejemplo animado/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Solo pesos chilenos. Tus datos se guardan en este dispositivo.'
      )
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('link', { name: 'Crear mi primer grupo' })
    );
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
    expect(await within(items[0]).findByAltText('Caro')).toBeInTheDocument();
    expect(within(items[1]).getByText('$0')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Divide gastos sin enredos' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Casa/ }));
    await waitFor(() => expect(currentPath()).toBe('/groups/old/expenses'));
  });

  it('cada tarjeta muestra "Al día" o cuánto falta por saldar', async () => {
    const settled = {
      ...makeGroup({ members: ['Ana', 'Beto'], name: 'Casa' }),
      id: 'settled',
      updatedAt: '2026-01-10T10:00:00.000Z',
    };
    const pending = {
      ...makeGroup({
        members: ['Ana', 'Beto', 'Caro'],
        name: 'Viaje',
        expenses: [
          { amount: 10_000, payer: 'Ana', among: ['Ana', 'Beto', 'Caro'] },
        ],
        payments: [{ from: 'Beto', to: 'Ana', amount: 1000 }],
      }),
      id: 'pending',
      updatedAt: '2026-04-20T10:00:00.000Z',
    };
    renderWithProviders(undefined, { groups: [settled, pending] });

    const items = await screen.findAllByRole('listitem');
    expect(
      within(items[0]).getByText('Pendiente: $5.666 por saldar')
    ).toBeInTheDocument();
    expect(within(items[1]).getByText('Al día')).toBeInTheDocument();
  });
});
