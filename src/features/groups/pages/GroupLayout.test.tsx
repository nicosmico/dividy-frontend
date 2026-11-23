import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';

const group = () => makeGroup({ members: ['Ana', 'Beto'], name: 'Asado' });

describe('Página del grupo', () => {
  it('redirige a la pestaña Gastos y navega entre pestañas', async () => {
    const { user } = renderWithProviders(undefined, {
      route: '/groups/g1',
      groups: [group()],
    });
    expect(
      await screen.findByRole('heading', { name: 'Asado' })
    ).toBeInTheDocument();
    await waitFor(() => expect(currentPath()).toBe('/groups/g1/expenses'));

    const nav = screen.getByRole('navigation', { name: 'Secciones del grupo' });
    await user.click(within(nav).getByRole('link', { name: 'Saldos' }));
    expect(currentPath()).toBe('/groups/g1/balances');
    await user.click(within(nav).getByRole('link', { name: 'Miembros' }));
    expect(currentPath()).toBe('/groups/g1/members');
    expect(within(nav).getByRole('link', { name: 'Miembros' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('muestra "Grupo no encontrado" con enlace al inicio', async () => {
    const { user } = renderWithProviders(undefined, {
      route: '/groups/nope/expenses',
    });
    expect(
      await screen.findByRole('heading', { name: 'Grupo no encontrado' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ir a mis grupos' }));
    expect(currentPath()).toBe('/');
  });

  it('renombra el grupo desde el menú', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Opciones del grupo' })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Renombrar grupo/ })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Renombrar grupo',
    });
    const input = within(dialog).getByLabelText('Nombre del grupo');
    await user.clear(input);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await within(dialog).findByText(
        'El nombre del grupo no puede estar vacío.'
      )
    ).toBeInTheDocument();

    await user.type(input, 'Cumpleaños');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByRole('heading', { name: 'Cumpleaños' })
    ).toBeInTheDocument();
    expect((await repository.get('g1'))?.name).toBe('Cumpleaños');
  });

  it('elimina el grupo tras confirmar con su nombre', async () => {
    const { user, repository } = renderWithProviders(undefined, {
      route: '/groups/g1/expenses',
      groups: [group()],
    });
    await user.click(
      await screen.findByRole('button', { name: 'Opciones del grupo' })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Eliminar grupo/ })
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('¿Eliminar "Asado"?')).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar grupo' })
    );

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(await repository.list()).toEqual([]);
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a Dividy' })
    ).toBeInTheDocument();
  });
});
