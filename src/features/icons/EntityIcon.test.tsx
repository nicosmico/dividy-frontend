import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';
import { EntityIcon } from './EntityIcon';

const hasIcon = (root: HTMLElement, name: string) =>
  root.querySelector(`svg.lucide-${name}`) !== null;

describe('EntityIcon', () => {
  it('es decorativo y calcula el ícono desde el texto', () => {
    const { container } = render(
      <EntityIcon text='Uber al terminal' kind='expense' />
    );
    const tile = container.querySelector('[data-slot="entity-icon"]')!;
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(tile).toHaveClass('bg-surface-2', 'text-primary');
    expect(hasIcon(container, 'car-taxi-front')).toBe(true);
  });

  it('sin coincidencia usa la boleta para gastos y las personas para grupos', () => {
    const expense = render(<EntityIcon text='Cosas' kind='expense' />);
    expect(hasIcon(expense.container, 'receipt')).toBe(true);
    const group = render(<EntityIcon text='Cosas' kind='group' />);
    expect(hasIcon(group.container, 'users')).toBe(true);
  });

  it('tiene un tamaño de lista y uno de encabezado', () => {
    const list = render(<EntityIcon text='Asado' kind='expense' size='list' />);
    const header = render(
      <EntityIcon text='Asado' kind='expense' size='header' />
    );
    expect(list.container.firstElementChild).toHaveClass('size-10');
    expect(header.container.firstElementChild).toHaveClass('size-11');
  });
});

describe('Íconos en la interfaz', () => {
  it('la tarjeta de grupo y el encabezado muestran el ícono del nombre', async () => {
    const group = makeGroup({
      name: 'Viaje a Pucón',
      members: ['Ana', 'Beto'],
    });
    const { container } = renderWithProviders(undefined, { groups: [group] });
    await screen.findByRole('heading', { name: 'Viaje a Pucón' });
    expect(hasIcon(container, 'plane')).toBe(true);
  });

  it('el encabezado del grupo muestra el ícono', async () => {
    const group = makeGroup({
      name: 'Asado del viernes',
      members: ['Ana', 'Beto'],
    });
    const { container } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    await screen.findByRole('heading', { name: 'Asado del viernes' });
    expect(hasIcon(container, 'beef')).toBe(true);
  });

  it('Crear grupo cambia el ícono en vivo al escribir el nombre', async () => {
    const { user, container } = renderWithProviders(undefined, {
      route: '/groups/new',
    });
    const input = await screen.findByLabelText('Nombre del grupo');
    expect(hasIcon(container, 'users')).toBe(true);
    await user.type(input, 'Viaje a Pucón');
    expect(hasIcon(container, 'plane')).toBe(true);
    expect(hasIcon(container, 'users')).toBe(false);
  });

  it('Editar grupo cambia el ícono en vivo', async () => {
    const group = makeGroup({ name: 'Casa', members: ['Ana', 'Beto'] });
    const { user } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Opciones del grupo' })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Editar grupo/ })
    );
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText('Nombre del grupo');
    expect(hasIcon(dialog, 'house')).toBe(true);
    await user.clear(input);
    await user.type(input, 'Cumple de Eli');
    expect(hasIcon(dialog, 'cake')).toBe(true);
  });

  it('cada fila de gasto muestra su ícono y mantiene la carita de quien pagó', async () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        {
          id: 'e1',
          description: 'Uber al terminal',
          amount: 4000,
          payer: 'Ana',
          among: ['Ana', 'Beto'],
          date: '2026-03-10',
        },
        {
          id: 'e2',
          description: 'Cosas',
          amount: 2000,
          payer: 'Beto',
          among: ['Ana', 'Beto'],
          date: '2026-03-09',
        },
      ],
    });
    renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    const rows = await screen.findAllByRole('button', { name: /Pagó/ });
    expect(hasIcon(rows[0], 'car-taxi-front')).toBe(true);
    expect(hasIcon(rows[1], 'receipt')).toBe(true);
    expect(within(rows[0]).getByText(/Pagó Ana/)).toBeInTheDocument();
    expect(rows[0].querySelector('[data-mood]')).not.toBeNull();
  });

  it('el formulario de gasto muestra el ícono en vivo junto a la descripción', async () => {
    const group = makeGroup({ members: ['Ana', 'Beto'] });
    const { user } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Agregar gasto' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(hasIcon(dialog, 'receipt')).toBe(true);
    await user.type(
      within(dialog).getByLabelText('Descripción'),
      'Uber al terminal'
    );
    await waitFor(() => expect(hasIcon(dialog, 'car-taxi-front')).toBe(true));
    expect(hasIcon(dialog, 'receipt')).toBe(false);
  });
});
