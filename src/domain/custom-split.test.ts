import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeBalances } from './balances';
import {
  addExpense,
  getMemberRemovalImpact,
  removeMember,
  updateExpense,
} from './group';
import {
  computeShares,
  describeSplitValues,
  formatPercent,
  presetSplit,
  validateSplit,
} from './split';
import { formatGroupSummary } from './summary';
import { groupArb, splitArb } from './test-utils/arbitraries';
import { makeExpense, makeGroup, members } from './test-utils/fixtures';
import type { Expense, Group, Split } from './types';
import { getGroupIssues, validateExpenseFields } from './validation';

const ABC = members('A', 'B', 'C', 'D');

function sharesOf(amount: number, split: Split, group = ABC) {
  return Object.fromEntries(
    computeShares({ amount, split }, group) as Map<string, number>
  );
}

const sum = (values: Iterable<number>) =>
  [...values].reduce((s, v) => s + v, 0);

describe('computeShares con división personalizada', () => {
  it.each([
    {
      name: 'partes 2/1/1 de $150.000',
      amount: 150_000,
      split: {
        type: 'shares',
        participantIds: ['A', 'B', 'C'],
        parts: { A: 2, B: 1, C: 1 },
      } as Split,
      expected: { A: 75_000, B: 37_500, C: 37_500 },
    },
    {
      name: 'partes con resto: $100.000 en 2/1 reparte el peso sobrante al primero',
      amount: 100_000,
      split: {
        type: 'shares',
        participantIds: ['A', 'B'],
        parts: { A: 1, B: 2 },
      } as Split,
      expected: { A: 33_334, B: 66_666 },
    },
    {
      name: 'partes: el peso que sobra no va a quien ya tenía su proporción exacta ($2 en 2/1/1)',
      amount: 2,
      split: {
        type: 'shares',
        participantIds: ['A', 'B', 'C'],
        parts: { A: 2, B: 1, C: 1 },
      } as Split,
      expected: { A: 1, B: 1, C: 0 },
    },
    {
      name: 'partes: el resto sigue el orden del grupo, no el de participantIds',
      amount: 10,
      split: {
        type: 'shares',
        participantIds: ['C', 'B', 'A'],
        parts: { A: 1, B: 1, C: 1 },
      } as Split,
      expected: { A: 4, B: 3, C: 3 },
    },
    {
      name: 'porcentaje 50/30/20 exacto',
      amount: 10_000,
      split: {
        type: 'percent',
        participantIds: ['A', 'B', 'C'],
        basisPoints: { A: 5000, B: 3000, C: 2000 },
      } as Split,
      expected: { A: 5000, B: 3000, C: 2000 },
    },
    {
      name: 'porcentaje con 2 decimales y resto',
      amount: 1_001,
      split: {
        type: 'percent',
        participantIds: ['A', 'B', 'C'],
        basisPoints: { A: 3334, B: 3333, C: 3333 },
      } as Split,
      // floor: 333, 333, 333 → sobra 2: a los dos primeros
      expected: { A: 334, B: 334, C: 333 },
    },
    {
      name: 'porcentaje 12,5 % de $1.000',
      amount: 1_000,
      split: {
        type: 'percent',
        participantIds: ['A', 'B'],
        basisPoints: { A: 1250, B: 8750 },
      } as Split,
      expected: { A: 125, B: 875 },
    },
    {
      name: 'montos exactos tal cual',
      amount: 100_000,
      split: {
        type: 'exact',
        participantIds: ['A', 'B', 'C'],
        amounts: { A: 50_000, B: 30_000, C: 20_000 },
      } as Split,
      expected: { A: 50_000, B: 30_000, C: 20_000 },
    },
    {
      name: 'un solo participante con partes paga todo',
      amount: 777,
      split: {
        type: 'shares',
        participantIds: ['B'],
        parts: { B: 5 },
      } as Split,
      expected: { B: 777 },
    },
  ])('$name', ({ amount, split, expected }) => {
    expect(sharesOf(amount, split)).toEqual(expected);
  });

  it('"equal" sigue idéntico: $10.000 entre 3 da 3.334 / 3.333 / 3.333', () => {
    expect(
      sharesOf(10_000, { type: 'equal', participantIds: ['A', 'B', 'C'] })
    ).toEqual({ A: 3334, B: 3333, C: 3333 });
  });

  it('ignora a quien ya no está en el grupo', () => {
    expect(
      sharesOf(
        100,
        {
          type: 'shares',
          participantIds: ['A', 'Z'],
          parts: { A: 1, Z: 3 },
        },
        members('A', 'B')
      )
    ).toEqual({ A: 100 });
  });

  it('no se desborda con el monto máximo y muchas partes', () => {
    const shares = sharesOf(999_999_999, {
      type: 'shares',
      participantIds: ['A', 'B', 'C', 'D'],
      parts: { A: 999_999, B: 1, C: 777_777, D: 3 },
    });
    expect(sum(Object.values(shares))).toBe(999_999_999);
  });
});

describe('propiedades de computeShares', () => {
  const idsOf = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

  it('para cualquier división válida las partes suman el monto y ninguna es negativa', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            fc.integer({ min: 1, max: 8 }),
            fc.integer({ min: 1, max: 999_999_999 })
          )
          .chain(([n, amount]) =>
            splitArb(amount, idsOf(n)).map((split) => ({ n, amount, split }))
          ),
        ({ n, amount, split }) => {
          const group = members(...idsOf(n));
          const shares = [...computeShares({ amount, split }, group).values()];
          expect(sum(shares)).toBe(amount);
          expect(Math.min(...shares)).toBeGreaterThanOrEqual(0);
          expect(shares).toHaveLength(split.participantIds.length);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('en partes y porcentajes cada parte difiere de la proporcional exacta en menos de $1', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            fc.integer({ min: 1, max: 8 }),
            fc.integer({ min: 1, max: 999_999_999 })
          )
          .chain(([n, amount]) =>
            splitArb(amount, idsOf(n), ['shares', 'percent']).map((split) => ({
              n,
              amount,
              split,
            }))
          ),
        ({ n, amount, split }) => {
          const group = members(...idsOf(n));
          const shares = computeShares({ amount, split }, group);
          const weights =
            split.type === 'shares'
              ? split.parts
              : split.type === 'percent'
                ? split.basisPoints
                : {};
          const total = Object.values(weights).reduce((s, w) => s + w, 0);
          for (const [id, share] of shares) {
            // |share - amount * w / total| < 1, in exact integer arithmetic:
            // |share * total - amount * w| < total.
            const diff =
              BigInt(share) * BigInt(total) -
              BigInt(amount) * BigInt(weights[id]);
            expect(diff < 0n ? -diff : diff).toBeLessThan(BigInt(total));
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('el resto va a los primeros del grupo: con partes iguales las partes no crecen', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999 }),
        fc.integer({ min: 1, max: 7 }),
        fc.integer({ min: 1, max: 9 }),
        (amount, n, part) => {
          const ids = idsOf(n);
          const split: Split = {
            type: 'shares',
            participantIds: [...ids].reverse(),
            parts: Object.fromEntries(ids.map((id) => [id, part])),
          };
          const inOrder = ids.map((id) =>
            computeShares({ amount, split }, members(...ids)).get(id)!
          );
          expect([...inOrder].sort((a, b) => b - a)).toEqual(inOrder);
          // Same result as the equal split.
          const equal = ids.map((id) =>
            computeShares(
              { amount, split: { type: 'equal', participantIds: ids } },
              members(...ids)
            ).get(id)!
          );
          expect(inOrder).toEqual(equal);
        }
      )
    );
  });

  it('presetSplit siempre da una división válida (y la de montos reparte como la igual)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 999_999_999 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('exact', 'percent', 'shares' as const),
        (amount, n, type) => {
          const group = members(...idsOf(n));
          const split = presetSplit(
            type,
            amount,
            group.map((m) => m.id),
            group
          );
          // Percent needs at least 1 bp each: n <= 8 always.
          expect(validateSplit(amount, split, group).ok).toBe(true);
          if (type === 'exact') {
            const equal = computeShares(
              {
                amount,
                split: {
                  type: 'equal',
                  participantIds: group.map((m) => m.id),
                },
              },
              group
            );
            expect([...computeShares({ amount, split }, group)]).toEqual([
              ...equal,
            ]);
          }
        }
      )
    );
  });

  it('en grupos con cualquier tipo de división los saldos suman 0 y el grupo es válido', () => {
    fc.assert(
      fc.property(
        groupArb({ splits: ['equal', 'exact', 'percent', 'shares'] }),
        (group) => {
          expect(getGroupIssues(group)).toEqual([]);
          expect(sum(computeBalances(group).map((b) => b.balance))).toBe(0);
        }
      )
    );
  });
});

describe('presetSplit', () => {
  it('montos: las partes iguales de hoy', () => {
    expect(presetSplit('exact', 100_000, ['A', 'B', 'C'], ABC)).toEqual({
      type: 'exact',
      participantIds: ['A', 'B', 'C'],
      amounts: { A: 33_334, B: 33_333, C: 33_333 },
    });
  });
  it('porcentaje: reparto igual con el resto de centésimas a los primeros', () => {
    expect(presetSplit('percent', 1, ['A', 'B', 'C'], ABC)).toEqual({
      type: 'percent',
      participantIds: ['A', 'B', 'C'],
      basisPoints: { A: 3334, B: 3333, C: 3333 },
    });
  });
  it('partes: 1 cada uno, en el orden del grupo', () => {
    expect(presetSplit('shares', 1, ['C', 'A'], ABC)).toEqual({
      type: 'shares',
      participantIds: ['A', 'C'],
      parts: { A: 1, C: 1 },
    });
  });
});

describe('validateSplit', () => {
  const exact = (amounts: Record<string, number>): Split => ({
    type: 'exact',
    participantIds: Object.keys(amounts),
    amounts,
  });
  const percent = (basisPoints: Record<string, number>): Split => ({
    type: 'percent',
    participantIds: Object.keys(basisPoints),
    basisPoints,
  });
  const shares = (parts: Record<string, number>): Split => ({
    type: 'shares',
    participantIds: Object.keys(parts),
    parts,
  });
  const message = (amount: number, split: Split) => {
    const result = validateSplit(amount, split, ABC);
    return result.ok ? 'ok' : result.error.message;
  };

  it.each([
    [
      exact({ A: 90_000, B: 0 }),
      'Quita de la división a B, que tiene $0, o asígnale un monto.',
    ],
    [exact({ A: 60_000, B: 30_000 }), 'Faltan $10.000 por asignar.'],
    [exact({ A: 60_000, B: 50_000 }), 'Te pasaste por $10.000.'],
    [exact({ A: 60_000, B: 40_000 }), 'ok'],
    [
      exact({ A: -5, B: 100_005 }),
      'Revisa el valor de A: debe ser un número entero.',
    ],
    [
      exact({ A: 50_000.5, B: 49_999.5 }),
      'Revisa el valor de A: debe ser un número entero.',
    ],
  ])('montos: %j → %s', (split, expected) => {
    expect(message(100_000, split)).toBe(expected);
  });

  it.each([
    [
      percent({ A: 5000, B: 4500 }),
      'Los porcentajes suman 95 %; deben sumar 100 %.',
    ],
    [
      percent({ A: 5000, B: 5100 }),
      'Los porcentajes suman 101 %; deben sumar 100 %.',
    ],
    [
      percent({ A: 5000, B: 4950 }),
      'Los porcentajes suman 99,5 %; deben sumar 100 %.',
    ],
    [
      percent({ A: 10_000, B: 0 }),
      'Quita de la división a B, que tiene 0 %, o asígnale un porcentaje.',
    ],
    [percent({ A: 3334, B: 3333, C: 3333 }), 'ok'],
  ])('porcentaje: %j → %s', (split, expected) => {
    expect(message(100_000, split)).toBe(expected);
  });

  it.each([
    [shares({ A: 0, B: 1 }), 'Cada parte debe ser al menos 1.'],
    [shares({ A: 1.5, B: 1 }), 'Cada parte debe ser al menos 1.'],
    [shares({ A: 2, B: 1 }), 'ok'],
  ])('partes: %j → %s', (split, expected) => {
    expect(message(100_000, split)).toBe(expected);
  });

  it('un valor faltante cuenta como inválido', () => {
    const broken: Split = {
      type: 'exact',
      participantIds: ['A', 'B'],
      amounts: { A: 100_000 },
    };
    expect(message(100_000, broken)).toContain('Revisa el valor de B');
  });

  it('descarta valores de quien no participa', () => {
    const result = validateSplit(
      100,
      {
        type: 'exact',
        participantIds: ['A'],
        amounts: { A: 100, B: 7 },
      },
      ABC
    );
    expect(result).toEqual({
      ok: true,
      value: { type: 'exact', participantIds: ['A'], amounts: { A: 100 } },
    });
  });

  it('el error del dominio lleva el código invalid_split', () => {
    const result = validateExpenseFields(
      { members: ABC },
      {
        description: 'Cabaña',
        amount: 100_000,
        payerId: 'A',
        split: exact({ A: 1, B: 1 }),
        date: '2026-03-10',
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_split');
  });
});

describe('formatPercent y describeSplitValues', () => {
  it('formatea en es-CL', () => {
    expect(formatPercent(5000)).toBe('50 %');
    expect(formatPercent(1250)).toBe('12,5 %');
    expect(formatPercent(3334)).toBe('33,34 %');
    expect(formatPercent(10_000)).toBe('100 %');
  });
  it('lista a los participantes en el orden del grupo', () => {
    expect(
      describeSplitValues(
        {
          type: 'shares',
          participantIds: ['C', 'A'],
          parts: { A: 2, C: 1 },
        },
        ABC
      )
    ).toBe('A 2, C 1');
    expect(
      describeSplitValues(
        { type: 'exact', participantIds: ['A'], amounts: { A: 1500 } },
        ABC
      )
    ).toBe('A $1.500');
    expect(
      describeSplitValues({ type: 'equal', participantIds: ['A'] }, ABC)
    ).toBeNull();
  });
});

describe('editar el monto de un gasto con montos exactos', () => {
  const group = makeGroup({
    members: ['A', 'B'],
    expenses: [
      {
        id: 'e1',
        amount: 100,
        payer: 'A',
        among: ['A', 'B'],
        split: {
          type: 'exact',
          participantIds: ['A', 'B'],
          amounts: { A: 60, B: 40 },
        },
      },
    ],
  });
  const fields = (amount: number) => ({
    description: 'Gasto',
    amount,
    payerId: 'A',
    split: group.expenses[0].split,
    date: '2026-01-01',
  });

  it('deja de cuadrar: el dominio lo rechaza', () => {
    const result = updateExpense(group, 'e1', fields(120));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.message).toBe('Faltan $20 por asignar.');
  });
  it('con partes y porcentajes se recalcula solo', () => {
    const shared: Group = {
      ...group,
      expenses: [
        {
          ...group.expenses[0],
          split: {
            type: 'shares',
            participantIds: ['A', 'B'],
            parts: { A: 3, B: 1 },
          },
        },
      ],
    };
    const result = updateExpense(shared, 'e1', {
      ...fields(120),
      split: shared.expenses[0].split,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        computeBalances(result.value).map((b) => [b.memberId, b.share])
      ).toEqual([
        ['A', 90],
        ['B', 30],
      ]);
    }
  });
  it('addExpense acepta una división personalizada válida', () => {
    const empty = makeGroup({ members: ['A', 'B'] });
    const result = addExpense(empty, {
      id: 'x',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...fields(100),
    });
    expect(result.ok).toBe(true);
  });
});

describe('eliminar un miembro con divisiones personalizadas', () => {
  const custom = (
    id: string,
    split: Split,
    amount = 100_000,
    payer = 'A'
  ): Expense =>
    makeExpense({ id, amount, payer, among: split.participantIds, split });
  const base = makeGroup({ members: ['A', 'B', 'C', 'D'] });
  const withExpenses = (...expenses: Expense[]): Group => ({
    ...base,
    expenses,
  });
  const removed = (
    group: Group,
    id: string,
    strategy: Parameters<typeof removeMember>[2]
  ) => {
    const result = removeMember(group, id, strategy);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };

  describe('reasignar', () => {
    it('montos: suma el monto al de quien recibe', () => {
      const group = withExpenses(
        custom('e1', {
          type: 'exact',
          participantIds: ['A', 'B', 'C'],
          amounts: { A: 50_000, B: 30_000, C: 20_000 },
        })
      );
      const next = removed(group, 'B', { type: 'reassign', toMemberId: 'C' });
      expect(next.expenses[0].split).toEqual({
        type: 'exact',
        participantIds: ['A', 'C'],
        amounts: { A: 50_000, C: 50_000 },
      });
    });
    it('porcentaje: suma el porcentaje', () => {
      const group = withExpenses(
        custom('e1', {
          type: 'percent',
          participantIds: ['A', 'B', 'C'],
          basisPoints: { A: 5000, B: 3000, C: 2000 },
        })
      );
      const next = removed(group, 'A', { type: 'reassign', toMemberId: 'C' });
      expect(next.expenses[0].split).toEqual({
        type: 'percent',
        participantIds: ['B', 'C'],
        basisPoints: { B: 3000, C: 7000 },
      });
    });
    it('partes: suma las partes', () => {
      const group = withExpenses(
        custom('e1', {
          type: 'shares',
          participantIds: ['A', 'B', 'C'],
          parts: { A: 2, B: 1, C: 1 },
        })
      );
      const next = removed(group, 'A', { type: 'reassign', toMemberId: 'B' });
      expect(next.expenses[0].split).toEqual({
        type: 'shares',
        participantIds: ['B', 'C'],
        parts: { B: 3, C: 1 },
      });
    });
    it.each([
      [
        'exact',
        {
          type: 'exact',
          participantIds: ['A', 'B'],
          amounts: { A: 70_000, B: 30_000 },
        } as Split,
        {
          type: 'exact',
          participantIds: ['A', 'D'],
          amounts: { A: 70_000, D: 30_000 },
        },
      ],
      [
        'percent',
        {
          type: 'percent',
          participantIds: ['A', 'B'],
          basisPoints: { A: 7000, B: 3000 },
        } as Split,
        {
          type: 'percent',
          participantIds: ['A', 'D'],
          basisPoints: { A: 7000, D: 3000 },
        },
      ],
      [
        'shares',
        {
          type: 'shares',
          participantIds: ['A', 'B'],
          parts: { A: 7, B: 3 },
        } as Split,
        { type: 'shares', participantIds: ['A', 'D'], parts: { A: 7, D: 3 } },
      ],
    ])(
      '%s: si quien recibe no participaba, toma el valor del eliminado',
      (_, split, expected) => {
        const next = removed(withExpenses(custom('e1', split)), 'B', {
          type: 'reassign',
          toMemberId: 'D',
        });
        expect(next.expenses[0].split).toEqual(expected);
      }
    );
    it('el pagador también pasa a quien recibe y el grupo sigue válido', () => {
      const group = withExpenses(
        custom(
          'e1',
          {
            type: 'shares',
            participantIds: ['A', 'B'],
            parts: { A: 1, B: 2 },
          },
          100_000,
          'B'
        )
      );
      const next = removed(group, 'B', { type: 'reassign', toMemberId: 'C' });
      expect(next.expenses[0].payerId).toBe('C');
      expect(getGroupIssues(next)).toEqual([]);
    });
  });

  describe('cascada', () => {
    const group = withExpenses(
      custom('exact', {
        type: 'exact',
        participantIds: ['A', 'B', 'C'],
        amounts: { A: 50_000, B: 30_000, C: 20_000 },
      }),
      custom('percent', {
        type: 'percent',
        participantIds: ['B', 'C'],
        basisPoints: { B: 4000, C: 6000 },
      }),
      custom('shares', {
        type: 'shares',
        participantIds: ['A', 'B', 'D'],
        parts: { A: 2, B: 1, D: 1 },
      }),
      custom('equal', { type: 'equal', participantIds: ['A', 'B'] }),
      custom('sin B', {
        type: 'shares',
        participantIds: ['A', 'C'],
        parts: { A: 2, C: 1 },
      }),
      custom('solo B', {
        type: 'exact',
        participantIds: ['B'],
        amounts: { B: 100_000 },
      })
    );

    it('el impacto cuenta los gastos que pasarán a partes iguales', () => {
      const impact = getMemberRemovalImpact(group, 'B');
      expect(impact.ok).toBe(true);
      if (impact.ok) {
        expect(
          impact.value.expensesConvertedByCascade.map((e) => e.id)
        ).toEqual(['exact', 'percent', 'shares']);
        expect(impact.value.expensesDeletedByCascade.map((e) => e.id)).toEqual([
          'solo B',
        ]);
      }
    });

    it('los gastos con división personalizada pasan a partes iguales entre los que quedan', () => {
      const next = removed(group, 'B', { type: 'cascade' });
      expect(next.expenses.map((e) => [e.id, e.split])).toEqual([
        ['exact', { type: 'equal', participantIds: ['A', 'C'] }],
        ['percent', { type: 'equal', participantIds: ['C'] }],
        ['shares', { type: 'equal', participantIds: ['A', 'D'] }],
        ['equal', { type: 'equal', participantIds: ['A'] }],
        [
          'sin B',
          {
            type: 'shares',
            participantIds: ['A', 'C'],
            parts: { A: 2, C: 1 },
          },
        ],
      ]);
      expect(getGroupIssues(next)).toEqual([]);
    });
  });

  it('propiedad: sacar a cualquiera con cualquier estrategia deja un grupo válido con saldos que suman 0', () => {
    fc.assert(
      fc.property(
        groupArb({
          minMembers: 2,
          splits: ['equal', 'exact', 'percent', 'shares'],
        }).chain((group) =>
          fc.record({
            group: fc.constant(group),
            index: fc.integer({ min: 0, max: group.members.length - 1 }),
            offset: fc.integer({ min: 1, max: group.members.length - 1 }),
            cascade: fc.boolean(),
          })
        ),
        ({ group, index, offset, cascade }) => {
          const id = group.members[index].id;
          const to = group.members[(index + offset) % group.members.length].id;
          const result = removeMember(
            group,
            id,
            cascade ? { type: 'cascade' } : { type: 'reassign', toMemberId: to }
          );
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(getGroupIssues(result.value)).toEqual([]);
          expect(sum(computeBalances(result.value).map((b) => b.balance))).toBe(
            0
          );
          // Every expense still adds up to its amount.
          for (const e of result.value.expenses) {
            expect(sum(computeShares(e, result.value.members).values())).toBe(
              e.amount
            );
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe('resumen compartido', () => {
  const group = makeGroup({
    name: 'Viaje',
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        description: 'Cabaña',
        amount: 150_000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
        split: {
          type: 'shares',
          participantIds: ['Ana', 'Beto', 'Carla'],
          parts: { Ana: 2, Beto: 1, Carla: 1 },
        },
      },
      {
        description: 'Cena',
        amount: 90_000,
        payer: 'Beto',
        among: ['Ana', 'Beto'],
        split: {
          type: 'exact',
          participantIds: ['Ana', 'Beto'],
          amounts: { Ana: 50_000, Beto: 40_000 },
        },
      },
      {
        description: 'Taxi',
        amount: 10_000,
        payer: 'Carla',
        among: ['Ana', 'Carla'],
        split: {
          type: 'percent',
          participantIds: ['Ana', 'Carla'],
          basisPoints: { Ana: 5000, Carla: 5000 },
        },
      },
      {
        description: 'Pan',
        amount: 3_000,
        payer: 'Ana',
        among: ['Ana', 'Beto'],
      },
    ],
  });

  it('describe cada tipo de división', () => {
    const lines = formatGroupSummary(group).split('\n');
    expect(lines).toContain(
      '• Cabaña: $150.000, pagó Ana, por partes (Ana 2, Beto 1, Carla 1)'
    );
    expect(lines).toContain(
      '• Cena: $90.000, pagó Beto, por montos (Ana $50.000, Beto $40.000)'
    );
    expect(lines).toContain(
      '• Taxi: $10.000, pagó Carla, por porcentaje (Ana 50 %, Carla 50 %)'
    );
    expect(lines).toContain('• Pan: $3.000, pagó Ana, entre Ana y Beto');
  });
});
