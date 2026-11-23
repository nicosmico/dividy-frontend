import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getAvatarUri } from './avatar-uri';
import { MemberAvatar } from './MemberAvatar';

describe('MemberAvatar', () => {
  it('muestra una imagen local (data URI) con el nombre como texto alternativo', () => {
    render(<MemberAvatar member={{ id: 'm1', name: 'Ana' }} />);
    const img = screen.getByRole('img', { name: 'Ana' });
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('es determinístico por id y cambia con el estado de ánimo', () => {
    expect(getAvatarUri('m1', 'happy')).toBe(getAvatarUri('m1', 'happy'));
    expect(getAvatarUri('m1', 'happy')).not.toBe(getAvatarUri('m1', 'sad'));
    expect(getAvatarUri('m1', 'happy')).not.toBe(getAvatarUri('m2', 'happy'));
  });

  it('no cambia al renombrar al miembro (la semilla es el id)', () => {
    const { rerender } = render(
      <MemberAvatar member={{ id: 'm1', name: 'Ana' }} />
    );
    const before = screen.getByRole('img').getAttribute('src');
    rerender(<MemberAvatar member={{ id: 'm1', name: 'Anita' }} />);
    expect(screen.getByRole('img', { name: 'Anita' }).getAttribute('src')).toBe(
      before
    );
  });
});
