import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '@/components/ui/sonner';

const registerSW = vi.hoisted(() => vi.fn());
vi.mock('virtual:pwa-register', () => ({ registerSW }));

import { registerServiceWorker, showUpdateToast } from './pwa';

const MESSAGE = 'Hay una nueva versión de Dividy';

describe('aviso de nueva versión', () => {
  beforeEach(() => {
    registerSW.mockReset();
  });

  it('no muestra nada al registrar el service worker (primera visita o sin cambios)', async () => {
    registerSW.mockReturnValue(vi.fn());
    render(<Toaster />);
    registerServiceWorker();
    expect(registerSW).toHaveBeenCalledTimes(1);
    // Let sonner flush anything it would have rendered.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it('muestra el aviso cuando el service worker dice que hay una versión nueva', async () => {
    const updateSW = vi.fn();
    registerSW.mockReturnValue(updateSW);
    render(<Toaster />);
    registerServiceWorker();
    const { onNeedRefresh } = registerSW.mock.calls[0][0] as {
      onNeedRefresh: () => void;
    };
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();

    onNeedRefresh();

    expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
    expect(updateSW).not.toHaveBeenCalled();
  });

  it('"Recargar" activa la versión nueva y recarga la página (updateSW(true))', async () => {
    const updateSW = vi.fn();
    const user = userEvent.setup();
    render(<Toaster />);
    showUpdateToast(updateSW);

    await user.click(await screen.findByRole('button', { name: 'Recargar' }));

    expect(updateSW).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('el aviso no desaparece solo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<Toaster />);
      showUpdateToast(vi.fn());
      expect(await screen.findByText(MESSAGE)).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
