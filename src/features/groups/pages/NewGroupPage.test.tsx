import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  currentPath,
  renderWithProviders,
  TEST_NOW,
} from '@/test/render-with-providers';

async function setup() {
  const view = renderWithProviders(undefined, { route: '/groups/new' });
  await screen.findByRole('heading', { name: 'Crear grupo' });
  return view;
}

describe('Crear grupo', () => {
  it('muestra el error del nombre vacío', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    expect(
      await screen.findByText('El nombre del grupo no puede estar vacío.')
    ).toBeInTheDocument();
  });

  it('pide al menos 2 miembros', async () => {
    const { user, repository } = await setup();
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Asado');
    await user.type(screen.getByLabelText('Miembros'), 'Ana{Enter}');
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    expect(
      await screen.findByText(/Agrega al menos 2 miembros/)
    ).toBeInTheDocument();
    expect(await repository.list()).toEqual([]);
  });

  it('agrega miembros con Enter y con el botón, y los quita con ×', async () => {
    const { user } = await setup();
    const input = screen.getByLabelText('Miembros');
    await user.type(input, 'Ana{Enter}');
    await user.type(input, 'Beto');
    await user.click(screen.getByRole('button', { name: /Agregar/ }));

    const list = screen.getByRole('list', { name: 'Miembros agregados' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(input).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Quitar a Ana' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('rechaza nombres de miembros duplicados (sin distinguir mayúsculas) y vacíos', async () => {
    const { user } = await setup();
    const input = screen.getByLabelText('Miembros');
    await user.type(input, 'Ana{Enter}');
    await user.type(input, ' ana {Enter}');
    expect(
      await screen.findByText('Ya hay alguien llamado "ana" en el grupo.')
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '   {Enter}');
    expect(
      await screen.findByText('El nombre no puede estar vacío.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('crea el grupo, lo guarda y navega a él', async () => {
    const { user, repository } = await setup();
    await user.type(screen.getByLabelText('Nombre del grupo'), '  Asado  ');
    const input = screen.getByLabelText('Miembros');
    await user.type(input, 'Ana{Enter}');
    await user.type(input, 'Beto{Enter}');
    // A name typed but not added yet is included on submit.
    await user.type(input, 'Caro');
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));

    await waitFor(() => expect(currentPath()).toBe('/groups/id4/expenses'));
    const [group] = await repository.list();
    expect(group).toMatchObject({
      id: 'id4',
      name: 'Asado',
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    });
    expect(group.members.map((m) => m.name)).toEqual(['Ana', 'Beto', 'Caro']);
    expect(await screen.findByRole('heading', { name: 'Asado' })).toBeVisible();
  });
});
