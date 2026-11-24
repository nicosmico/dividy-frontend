/**
 * Background colors of the member avatars, indexed by `member.avatar.color`
 * (0-7, `AVATAR_COLOR_COUNT` in the domain). They are illustration data, not
 * theme tokens: avatars look the same in light and dark mode (see
 * docs/design-system.md, "Colores de avatar"). Do not reorder: the index is
 * stored on every member.
 */
export const AVATAR_COLORS = [
  { name: 'menta', hex: '#D6FEC2' },
  { name: 'celeste', hex: '#CFE3FF' },
  { name: 'lavanda', hex: '#E3D9FF' },
  { name: 'durazno', hex: '#FFDCC7' },
  { name: 'rosado', hex: '#FFD6E5' },
  { name: 'mantequilla', hex: '#FFF1B8' },
  { name: 'aqua', hex: '#C8F2EA' },
  { name: 'gris perla', hex: '#E4E8EE' },
] as const;

/** Dark ink for text drawn over an avatar background (the initial placeholder). */
export const AVATAR_INK = '#10213F';

export function avatarBackground(color: number): string {
  return AVATAR_COLORS[color]?.hex ?? AVATAR_COLORS[0].hex;
}
