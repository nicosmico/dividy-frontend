import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getCachedAvatarUri, loadAvatarUri } from './avatar-uri';
import { MemberAvatar } from './MemberAvatar';

describe('MemberAvatar', () => {
  it('muestra la inicial mientras se genera y luego una imagen local con el nombre como texto alternativo', async () => {
    render(<MemberAvatar member={{ id: 'fresh1', name: 'Ana' }} />);
    const placeholder = screen.getByRole('img', { name: 'Ana' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).toHaveTextContent('A');
    expect(placeholder).toHaveClass('size-10');

    const img = await screen.findByAltText('Ana');
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(img).toHaveClass('size-10');
  });

  it('usa el avatar en caché sin pasar por el placeholder', async () => {
    await loadAvatarUri('cached1', 'happy');
    render(<MemberAvatar member={{ id: 'cached1', name: 'Beto' }} />);
    expect(screen.getByAltText('Beto')).toBeInTheDocument();
  });

  it('es determinístico por id y cambia con el estado de ánimo', async () => {
    const happy = await loadAvatarUri('m1', 'happy');
    expect(await loadAvatarUri('m1', 'happy')).toBe(happy);
    expect(getCachedAvatarUri('m1', 'happy')).toBe(happy);
    expect(await loadAvatarUri('m1', 'sad')).not.toBe(happy);
    expect(await loadAvatarUri('m2', 'happy')).not.toBe(happy);
  });

  it('no cambia al renombrar al miembro (la semilla es el id)', async () => {
    const { rerender } = render(
      <MemberAvatar member={{ id: 'm1', name: 'Ana' }} />
    );
    const before = (await screen.findByAltText('Ana')).getAttribute('src');
    rerender(<MemberAvatar member={{ id: 'm1', name: 'Anita' }} />);
    await waitFor(() =>
      expect(screen.getByAltText('Anita').getAttribute('src')).toBe(before)
    );
  });
});
