import { act, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it } from 'vitest';

import { Toaster } from './sonner';

describe('Toaster', () => {
  it('muestra un solo aviso a la vez: el nuevo reemplaza al anterior', async () => {
    render(<Toaster />);

    act(() => {
      toast.success('Grupo creado');
    });
    expect(await screen.findByText('Grupo creado')).toBeInTheDocument();

    act(() => {
      toast.success('Miembro eliminado', {
        action: { label: 'Deshacer', onClick: () => {} },
      });
    });
    expect(await screen.findByText('Miembro eliminado')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Grupo creado')).not.toBeInTheDocument()
    );
  });
});
