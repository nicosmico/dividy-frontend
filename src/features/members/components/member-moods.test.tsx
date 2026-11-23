import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import {
  computeMemberMoods,
  moodForBalance,
  useMemberMoods,
} from './member-moods';

describe('caritas según el saldo', () => {
  it.each([
    [0, 'happy'],
    [1, 'sad'],
    [-1, 'sad'],
    [15000, 'sad'],
    [-15000, 'sad'],
  ] as const)('saldo %i → %s', (balance, mood) => {
    expect(moodForBalance(balance)).toBe(mood);
  });

  it('triste si debe o le deben, feliz si está al día', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Caro'],
      expenses: [{ amount: 3000, payer: 'Ana', among: ['Ana', 'Beto'] }],
    });
    const moods = computeMemberMoods(group);
    expect(moods.get('Ana')).toBe('sad'); // le deben
    expect(moods.get('Beto')).toBe('sad'); // debe
    expect(moods.get('Caro')).toBe('happy'); // no participa
  });

  it('todos felices cuando el grupo está al día', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [{ amount: 3000, payer: 'Ana', among: ['Ana', 'Beto'] }],
      payments: [{ from: 'Beto', to: 'Ana', amount: 1500 }],
    });
    expect([...computeMemberMoods(group).values()]).toEqual(['happy', 'happy']);
  });

  it('un grupo sin gastos deja a todos felices', () => {
    const group = makeGroup({ members: ['Ana', 'Beto'] });
    expect([...computeMemberMoods(group).values()]).toEqual(['happy', 'happy']);
  });

  it('useMemberMoods devuelve el mismo mapa mientras el grupo no cambia', () => {
    const group = makeGroup({ members: ['Ana', 'Beto'] });
    const { result, rerender } = renderHook(() => useMemberMoods(group));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
