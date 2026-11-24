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
  it('muestra contadores de caracteres en el nombre del grupo y en el del miembro', async () => {
    const { user } = await setup();
    expect(screen.getAllByText('0/40')).toHaveLength(2);
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Asado');
    await user.type(screen.getByLabelText('Miembros'), 'Ana');
    expect(screen.getByText('5/40')).toBeInTheDocument();
    expect(screen.getByText('3/40')).toBeInTheDocument();
  });

  it('muestra el error del nombre vacío', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    expect(
      await screen.findByText('Escribe un nombre para el grupo.')
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
      await screen.findByText(
        'Ya hay alguien llamado "Ana" en el grupo. Usa otro nombre.'
      )
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '   {Enter}');
    expect(
      await screen.findByText('Escribe un nombre para el miembro.')
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
    // Right after creating it, the app asks who you are.
    expect(
      await screen.findByRole('dialog', { name: '¿Quién eres?' })
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'No soy parte de este grupo' })
    );
    expect(await screen.findByRole('heading', { name: 'Asado' })).toBeVisible();
  });

  it('tocar la carita da otra cara antes de crear el grupo, con colores en orden', async () => {
    const { user, repository } = await setup();
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Asado');
    const input = screen.getByLabelText('Miembros');
    await user.type(input, 'Ana{Enter}');
    await user.type(input, 'Beto{Enter}');
    const colors = () =>
      [...document.querySelectorAll('[data-avatar-color]')].map((el) =>
        el.getAttribute('data-avatar-color')
      );
    await waitFor(() => expect(colors()).toEqual(['0', '1']));

    const button = screen.getByRole('button', {
      name: 'Cambiar avatar de Beto',
    });
    expect(button).toHaveClass('size-11');
    await user.click(button);
    expect(colors()).toEqual(['0', '1']);

    await user.click(screen.getByRole('button', { name: 'Crear grupo' }));
    await waitFor(() => expect(currentPath()).toMatch(/\/expenses$/));
    const [group] = await repository.list();
    expect(group.members.map((m) => m.avatar.color)).toEqual([0, 1]);
    expect(group.members[0].avatar.seed).toBe(group.members[0].id);
    expect(group.members[1].avatar.seed).not.toBe(group.members[1].id);
  });
});
