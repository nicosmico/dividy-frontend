import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getCachedAvatarUri, loadAvatarUri } from './avatar-uri';
import { MemberAvatar } from './MemberAvatar';

const member = (name: string, seed: string, color = 0) => ({
  name,
  avatar: { seed, color },
});

describe('MemberAvatar', () => {
  it('muestra la inicial mientras se genera y luego una imagen local con el nombre como texto alternativo', async () => {
    render(<MemberAvatar member={member('Ana', 'fresh1', 3)} />);
    const placeholder = screen.getByRole('img', { name: 'Ana' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).toHaveTextContent('A');
    expect(placeholder).toHaveClass('size-10');
    expect(placeholder).toHaveAttribute('data-avatar-color', '3');

    const img = await screen.findByAltText('Ana');
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(img).toHaveClass('size-10');
    expect(img).toHaveAttribute('data-avatar-color', '3');
  });

  it('usa el avatar en caché sin pasar por el placeholder', async () => {
    await loadAvatarUri({ seed: 'cached1', color: 0, mood: 'happy' });
    render(<MemberAvatar member={member('Beto', 'cached1')} />);
    expect(screen.getByAltText('Beto')).toBeInTheDocument();
  });

  it('es determinístico por semilla y cambia con el ánimo, la semilla y el color', async () => {
    const base = { seed: 'm1', color: 0, mood: 'happy' } as const;
    const happy = await loadAvatarUri(base);
    expect(await loadAvatarUri(base)).toBe(happy);
    expect(getCachedAvatarUri(base)).toBe(happy);
    expect(await loadAvatarUri({ ...base, mood: 'sad' })).not.toBe(happy);
    expect(await loadAvatarUri({ ...base, seed: 'm2' })).not.toBe(happy);
    const other = await loadAvatarUri({ ...base, color: 1 });
    expect(other).not.toBe(happy);
    expect(decodeURIComponent(happy)).toContain('#D6FEC2');
    expect(decodeURIComponent(other)).toContain('#CFE3FF');
  });

  it('no cambia al renombrar al miembro (la semilla es la guardada)', async () => {
    const { rerender } = render(<MemberAvatar member={member('Ana', 'm1')} />);
    const before = (await screen.findByAltText('Ana')).getAttribute('src');
    rerender(<MemberAvatar member={member('Anita', 'm1')} />);
    await waitFor(() =>
      expect(screen.getByAltText('Anita').getAttribute('src')).toBe(before)
    );
  });

  it('cambia la cara cuando cambia la semilla guardada', async () => {
    const { rerender } = render(<MemberAvatar member={member('Ana', 's1')} />);
    const before = (await screen.findByAltText('Ana')).getAttribute('src');
    rerender(<MemberAvatar member={member('Ana', 's2')} />);
    await waitFor(() =>
      expect(screen.getByAltText('Ana').getAttribute('src')).not.toBe(before)
    );
  });
});
