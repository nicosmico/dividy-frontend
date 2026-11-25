import { describe, expect, it } from 'vitest';
import { nextAvatarColor } from './avatar';
import { computeBalances } from './balances';
import { formatAmountInput, parseAmountText } from './money';
import { computeShares, presetSplit } from './split';
import { makeGroup } from './test-utils/fixtures';
import type { Member } from './types';

/**
 * Edge cases that the main suites do not reach: negative amounts in inputs,
 * defensive paths for data that should not exist but could arrive from an
 * old or damaged document.
 */

const members: Member[] = ['A', 'B', 'C'].map((id, i) => ({
  id,
  name: id,
  avatar: { color: i, seed: id },
}));

describe('formatAmountInput con negativos y centavos', () => {
  it.each([
    [-12_500, 'CLP', '-12.500'],
    [-1_250, 'USD', '-12,50'],
    [5, 'USD', '0,05'],
    [123_456_789, 'USD', '1.234.567,89'],
  ] as const)('%d en %s → %s', (amount, currency, expected) => {
    expect(formatAmountInput(amount, currency)).toBe(expected);
  });
});

describe('parseAmountText: el mensaje depende de si la moneda usa decimales', () => {
  it('en CLP pide solo números', () => {
    const result = parseAmountText('12a', 'CLP');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(
        'Revisa el monto: usa solo números, como 12.500.'
      );
    }
  });
  it('en USD menciona la coma de los decimales', () => {
    const result = parseAmountText('12a', 'USD');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('una coma para los decimales');
    }
  });
});

describe('datos que no deberían existir no rompen los cálculos', () => {
  it('un color de avatar inválido no cuenta como usado', () => {
    expect(
      nextAvatarColor([{ avatar: { color: 99 } }, { avatar: { color: 0 } }])
    ).toBe(1);
  });

  it('un pago con un miembro que ya no está se ignora en los saldos', () => {
    const group = makeGroup({ members: ['Ana', 'Beto'] });
    group.payments.push({
      id: 'p1',
      fromId: 'Nadie',
      toId: 'Tampoco',
      amount: 1000,
      date: '2026-01-01',
      createdAt: group.createdAt,
    });
    expect(computeBalances(group).every((b) => b.balance === 0)).toBe(true);
  });

  it('porcentajes que suman 0 reparten 0 (en vez de dividir por cero)', () => {
    const shares = computeShares(
      {
        amount: 1000,
        split: {
          type: 'percent',
          participantIds: ['A', 'B'],
          basisPoints: { A: 0, B: 0 },
        },
      },
      members
    );
    expect([...shares.values()]).toEqual([0, 0]);
  });
});

describe('presetSplit', () => {
  it('iguales: los participantes en el orden del grupo', () => {
    expect(presetSplit('equal', 1000, ['C', 'A'], members)).toEqual({
      type: 'equal',
      participantIds: ['A', 'C'],
    });
  });
});
