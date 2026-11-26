import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';
import { reloadForNewVersion } from './stale-chunks';

vi.mock('./stale-chunks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./stale-chunks')>()),
  reloadForNewVersion: vi.fn(),
}));

function Throws({ error }: { error: Error }): never {
  throw error;
}

function renderWith(error: Error) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ErrorBoundary>
          <Throws error={error} />
        </ErrorBoundary>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const staleChunk = new TypeError(
  'Failed to fetch dynamically imported module: /assets/balances-old.js'
);

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.mocked(reloadForNewVersion).mockReset();
  });

  it('si falta un archivo de una versión anterior, recarga la página', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(reloadForNewVersion).mockReturnValue(true);
    renderWith(staleChunk);
    expect(reloadForNewVersion).toHaveBeenCalledOnce();
  });

  it('si ya recargó hace poco, pide recargar en vez de decir «Algo salió mal»', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(reloadForNewVersion).mockReturnValue(false);
    renderWith(staleChunk);
    expect(
      screen.getByRole('heading', { name: 'Hay una nueva versión de Dividy' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recargar' })
    ).toBeInTheDocument();
  });

  it('cualquier otro error muestra «Algo salió mal» y no recarga', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWith(new Error('boom'));
    expect(
      screen.getByRole('heading', { name: 'Algo salió mal' })
    ).toBeInTheDocument();
    expect(reloadForNewVersion).not.toHaveBeenCalled();
  });
});
