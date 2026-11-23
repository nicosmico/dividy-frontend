import { describe, expect, it } from 'vitest';
import { computeShares } from './split';
import { makeExpense, members } from './test-utils/fixtures';

const shares = (
  amount: number,
  among: string[],
  group: string[] = ['A', 'B', 'C', 'D']
) => [
  ...computeShares(
    makeExpense({ amount, payer: 'A', among }),
    members(...group)
  ),
];

describe('computeShares', () => {
  it.each([
    {
      amount: 10_000,
      among: ['A', 'B', 'C'],
      expected: [
        ['A', 3334],
        ['B', 3333],
        ['C', 3333],
      ],
    },
    {
      amount: 9_000,
      among: ['A', 'B', 'C'],
      expected: [
        ['A', 3000],
        ['B', 3000],
        ['C', 3000],
      ],
    },
    {
      amount: 10,
      among: ['A', 'B', 'C', 'D'],
      expected: [
        ['A', 3],
        ['B', 3],
        ['C', 2],
        ['D', 2],
      ],
    },
    {
      amount: 1,
      among: ['A', 'B'],
      expected: [
        ['A', 1],
        ['B', 0],
      ],
    },
    { amount: 500, among: ['C'], expected: [['C', 500]] },
  ])(
    'reparte $amount entre $among.length con el resto a los primeros',
    ({ amount, among, expected }) => {
      expect(shares(amount, among)).toEqual(expected);
    }
  );

  it('asigna el resto según el orden de los miembros del grupo, no el de participantIds', () => {
    expect(shares(10_000, ['C', 'A', 'B'])).toEqual([
      ['A', 3334],
      ['B', 3333],
      ['C', 3333],
    ]);
  });

  it('sólo considera a los participantes del gasto, no a todo el grupo', () => {
    expect(shares(100, ['B', 'D'])).toEqual([
      ['B', 50],
      ['D', 50],
    ]);
  });

  it('suma exactamente el monto del gasto', () => {
    const total = shares(10_000, ['A', 'B', 'C']).reduce(
      (s, [, v]) => s + v,
      0
    );
    expect(total).toBe(10_000);
  });

  it('ignora participantes que no están en el grupo y devuelve vacío si no queda ninguno', () => {
    expect(shares(100, ['Z'])).toEqual([]);
    expect(shares(100, ['A', 'Z'])).toEqual([['A', 100]]);
  });
});
