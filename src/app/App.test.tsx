import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryGroupRepository } from '@/data';
import { currentPath, renderWithProviders } from '@/test/render-with-providers';

describe('App', () => {
  it('muestra la página 404 para rutas desconocidas', async () => {
    const { user } = renderWithProviders(undefined, {
      route: '/nada/por/aqui',
    });
    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
  });

  it('el error boundary muestra una pantalla amable y permite volver al inicio', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repository = new InMemoryGroupRepository();
    vi.spyOn(repository, 'list').mockRejectedValue(new Error('boom'));
    const { user } = renderWithProviders(undefined, { repository });

    expect(
      await screen.findByRole('heading', { name: 'Algo salió mal' })
    ).toBeInTheDocument();

    vi.spyOn(repository, 'list').mockResolvedValue([]);
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }));
    expect(
      await screen.findByRole('heading', { name: 'Divide gastos sin enredos' })
    ).toBeInTheDocument();
  });

  it('el logo del encabezado lleva al inicio', async () => {
    const { user } = renderWithProviders(undefined, { route: '/groups/new' });
    await user.click(screen.getByRole('link', { name: 'Dividy' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
  });
});
