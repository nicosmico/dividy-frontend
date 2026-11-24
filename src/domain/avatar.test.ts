import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  AVATAR_COLOR_COUNT,
  nextAvatarColor,
  regenerateMemberAvatar,
  validateAvatar,
} from './avatar';
import { addMember, createGroup, removeMember } from './group';
import { makeGroup } from './test-utils/fixtures';
import type { Group, Result } from './types';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok)
    throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}

const colors = (g: Group) => g.members.map((m) => m.avatar.color);

function grow(count: number): Group {
  let group = unwrap(
    createGroup({
      id: 'g',
      name: 'G',
      members: [{ id: 'm0', name: 'M0' }],
      now: '2026-01-01T00:00:00.000Z',
    })
  );
  for (let i = 1; i < count; i++) {
    group = unwrap(addMember(group, { id: `m${i}`, name: `M${i}` }));
  }
  return group;
}

describe('asignación de color', () => {
  it('toma el primer color libre, en orden, sin repetir hasta 8', () => {
    expect(colors(grow(8))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('desde el 9.º vuelve a empezar en orden', () => {
    expect(colors(grow(11))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2]);
  });

  it('un miembro nuevo toma el primer color que quedó libre', () => {
    const group = grow(4);
    const without = unwrap(removeMember(group, 'm1', { type: 'cascade' }));
    const next = unwrap(addMember(without, { id: 'n', name: 'Nuevo' }));
    expect(colors(next)).toEqual([0, 2, 3, 1]);
  });

  it('eliminar a otro miembro no cambia los colores guardados', () => {
    const group = grow(5);
    const without = unwrap(removeMember(group, 'm1', { type: 'cascade' }));
    expect(without.members.map((m) => [m.id, m.avatar.color])).toEqual([
      ['m0', 0],
      ['m2', 2],
      ['m3', 3],
      ['m4', 4],
    ]);
  });

  it('createGroup asigna colores en orden', () => {
    const group = unwrap(
      createGroup({
        id: 'g',
        name: 'G',
        members: ['A', 'B', 'C'].map((name) => ({ id: name, name })),
        now: '2026-01-01T00:00:00.000Z',
      })
    );
    expect(colors(group)).toEqual([0, 1, 2]);
  });

  it('la semilla inicial es el id, o la que pide la UI', () => {
    const group = unwrap(
      createGroup({
        id: 'g',
        name: 'G',
        members: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B', avatarSeed: 'otra' },
        ],
        now: '2026-01-01T00:00:00.000Z',
      })
    );
    expect(group.members.map((m) => m.avatar.seed)).toEqual(['a', 'otra']);
  });

  it('propiedad: los primeros min(n, 8) miembros tienen colores distintos', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (n) => {
        const first = colors(grow(n)).slice(0, AVATAR_COLOR_COUNT);
        expect(new Set(first).size).toBe(Math.min(n, AVATAR_COLOR_COUNT));
      })
    );
  });

  it('propiedad: nunca se repite un color mientras queden libres', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 7 }), { maxLength: 7 }),
        (used) => {
          const unique = [...new Set(used)];
          const next = nextAvatarColor(
            unique.map((color) => ({ avatar: { color } }))
          );
          expect(unique).not.toContain(next);
        }
      )
    );
  });
});

describe('validateAvatar', () => {
  it.each([
    ['color negativo', { color: -1, seed: 's' }],
    ['color 8', { color: 8, seed: 's' }],
    ['color fraccionario', { color: 1.5, seed: 's' }],
    ['semilla vacía', { color: 0, seed: '  ' }],
  ])('rechaza %s', (_n, avatar) => {
    const result = validateAvatar(avatar);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_avatar');
  });

  it('acepta color 0 a 7 con semilla', () => {
    expect(validateAvatar({ color: 7, seed: 's' }).ok).toBe(true);
  });
});

describe('regenerateMemberAvatar', () => {
  const group = makeGroup({ members: ['Ana', 'Beto'] });

  it('cambia solo la semilla de ese miembro y deja igual el color', () => {
    const next = unwrap(regenerateMemberAvatar(group, 'Beto', 'nueva'));
    expect(next.members[1].avatar).toEqual({
      color: group.members[1].avatar.color,
      seed: 'nueva',
    });
    expect(next.members[0]).toEqual(group.members[0]);
    expect(group.members[1].avatar.seed).toBe('Beto');
  });

  it('rechaza un miembro que no existe', () => {
    const result = regenerateMemberAvatar(group, 'zzz', 'x');
    expect(!result.ok && result.error.code).toBe('member_not_found');
  });

  it('rechaza una semilla vacía', () => {
    const result = regenerateMemberAvatar(group, 'Ana', '');
    expect(!result.ok && result.error.code).toBe('invalid_avatar');
  });
});
