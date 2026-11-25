import { describe, expect, it } from 'vitest';

import { computeBalances } from './balances';
import { getMemberRemovalImpact, removeMember } from './group';
import { previewBalanceChange } from './impact';
import { computeShares, redistributeSplit } from './split';
import { makeExpense, makeGroup, members } from './test-utils/fixtures';
import type { Group, Result, Split } from './types';
import { getGroupIssues } from './validation';

/** Removing a member splits their share equally among the rest (ADR 0010). */

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const trio = members('Ana', 'Beto', 'Carla');
const redistribute = (group: Group, id: string) =>
  unwrap(removeMember(group, id, { type: 'redistribute' }));

/** An expense Ana paid, shared with the given split. */
function trioGroup(amount: number, split: Split): Group {
  const group = makeGroup({ members: ['Ana', 'Beto', 'Carla'] });
  return {
    ...group,
    expenses: [
      makeExpense({
        id: 'e1',
        amount,
        payer: 'Ana',
        among: split.participantIds,
        split,
      }),
    ],
  };
}

describe('eliminar a Beto reparte su parte entre los demás', () => {
  it('el asado: $30.000 en partes iguales entre Ana, Beto y Carla', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        {
          description: 'Asado',
          amount: 30_000,
          payer: 'Ana',
          among: ['Ana', 'Beto', 'Carla'],
        },
      ],
    });
    const next = redistribute(group, 'Beto');
    expect(next.expenses[0].split).toEqual({
      type: 'equal',
      participantIds: ['Ana', 'Carla'],
    });
    const shares = computeShares(next.expenses[0], next.members);
    expect(Object.fromEntries(shares)).toEqual({ Ana: 15_000, Carla: 15_000 });
    const balances = Object.fromEntries(
      computeBalances(next).map((b) => [b.memberId, b.balance])
    );
    expect(balances).toEqual({ Ana: 15_000, Carla: -15_000 });
    expect(
      previewBalanceChange(group, next).map((c) => [
        c.memberId,
        c.before,
        c.after,
      ])
    ).toEqual([
      ['Ana', 20_000, 15_000],
      ['Carla', -10_000, -15_000],
    ]);
    expect(getGroupIssues(next)).toEqual([]);
  });

  it.each([
    {
      name: 'montos 60/20/20 → 70/30',
      amount: 100_000,
      split: {
        type: 'exact',
        participantIds: ['Ana', 'Beto', 'Carla'],
        amounts: { Ana: 60_000, Beto: 20_000, Carla: 20_000 },
      } as Split,
      expected: {
        type: 'exact',
        participantIds: ['Ana', 'Carla'],
        amounts: { Ana: 70_000, Carla: 30_000 },
      },
    },
    {
      name: 'montos: el resto va al primero del grupo (7 → 4 y 3)',
      amount: 101,
      split: {
        type: 'exact',
        participantIds: ['Ana', 'Beto', 'Carla'],
        amounts: { Ana: 50, Beto: 7, Carla: 44 },
      } as Split,
      expected: {
        type: 'exact',
        participantIds: ['Ana', 'Carla'],
        amounts: { Ana: 54, Carla: 47 },
      },
    },
    {
      name: 'porcentaje 50/25/25 → 62,5/37,5',
      amount: 100_000,
      split: {
        type: 'percent',
        participantIds: ['Ana', 'Beto', 'Carla'],
        basisPoints: { Ana: 5000, Beto: 2500, Carla: 2500 },
      } as Split,
      expected: {
        type: 'percent',
        participantIds: ['Ana', 'Carla'],
        basisPoints: { Ana: 6250, Carla: 3750 },
      },
    },
    {
      name: 'porcentaje: el punto básico impar va al primero (2501 → 1251 y 1250)',
      amount: 100_000,
      split: {
        type: 'percent',
        participantIds: ['Ana', 'Beto', 'Carla'],
        basisPoints: { Ana: 5000, Beto: 2501, Carla: 2499 },
      } as Split,
      expected: {
        type: 'percent',
        participantIds: ['Ana', 'Carla'],
        basisPoints: { Ana: 6251, Carla: 3749 },
      },
    },
    {
      name: 'partes 2/1/1 pasan a montos exactos (62.500 / 37.500)',
      amount: 100_000,
      split: {
        type: 'shares',
        participantIds: ['Ana', 'Beto', 'Carla'],
        parts: { Ana: 2, Beto: 1, Carla: 1 },
      } as Split,
      // 50.000 / 25.000 / 25.000, y los 25.000 de Beto se reparten por mitades
      expected: {
        type: 'exact',
        participantIds: ['Ana', 'Carla'],
        amounts: { Ana: 62_500, Carla: 37_500 },
      },
    },
    {
      name: 'partes con resto: 34/33/33 → 51/49',
      amount: 100,
      split: {
        type: 'shares',
        participantIds: ['Ana', 'Beto', 'Carla'],
        parts: { Ana: 1, Beto: 1, Carla: 1 },
      } as Split,
      expected: {
        type: 'exact',
        participantIds: ['Ana', 'Carla'],
        amounts: { Ana: 51, Carla: 49 },
      },
    },
    {
      name: 'partes: quien quedaría con 0 sale de la división',
      amount: 1,
      split: {
        type: 'shares',
        participantIds: ['Ana', 'Beto', 'Carla'],
        parts: { Ana: 1, Beto: 1, Carla: 1000 },
      } as Split,
      expected: {
        type: 'exact',
        participantIds: ['Ana'],
        amounts: { Ana: 1 },
      },
    },
    {
      name: 'iguales: sólo se quita a Beto',
      amount: 90_000,
      split: {
        type: 'equal',
        participantIds: ['Ana', 'Beto', 'Carla'],
      } as Split,
      expected: { type: 'equal', participantIds: ['Ana', 'Carla'] },
    },
  ])('$name', ({ amount, split, expected }) => {
    const group = trioGroup(amount, split);
    const next = redistribute(group, 'Beto');
    expect(next.expenses[0].split).toEqual(expected);
    expect(next.expenses[0].amount).toBe(amount);
    expect(getGroupIssues(next)).toEqual([]);
    const shares = computeShares(next.expenses[0], next.members);
    expect([...shares.values()].reduce((s, v) => s + v, 0)).toBe(amount);
  });

  it('si era el único participante, el gasto se elimina', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        { id: 'solo', amount: 5_000, payer: 'Ana', among: ['Beto'] },
        { id: 'otro', amount: 4_000, payer: 'Ana', among: ['Ana', 'Beto'] },
      ],
    });
    const next = redistribute(group, 'Beto');
    expect(next.expenses.map((e) => e.id)).toEqual(['otro']);
    expect(next.expenses[0].split.participantIds).toEqual(['Ana']);
  });

  it('elimina los gastos que pagó y los pagos que envió o recibió', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        { id: 'pagado', amount: 9_000, payer: 'Beto', among: ['Ana', 'Beto'] },
        { id: 'queda', amount: 6_000, payer: 'Ana', among: ['Ana', 'Carla'] },
      ],
      payments: [
        { id: 'p1', from: 'Beto', to: 'Ana', amount: 1_000 },
        { id: 'p2', from: 'Carla', to: 'Beto', amount: 2_000 },
        { id: 'p3', from: 'Carla', to: 'Ana', amount: 3_000 },
      ],
    });
    const next = redistribute(group, 'Beto');
    expect(next.expenses.map((e) => e.id)).toEqual(['queda']);
    expect(next.payments.map((p) => p.id)).toEqual(['p3']);
  });

  it('los gastos donde no participaba quedan idénticos', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto', 'Carla'],
      expenses: [
        { id: 'e1', amount: 7_001, payer: 'Ana', among: ['Ana', 'Carla'] },
      ],
    });
    expect(redistribute(group, 'Beto').expenses).toEqual(group.expenses);
  });

  it('un miembro que no está en el grupo es un error', () => {
    const group = trioGroup(100, { type: 'equal', participantIds: ['Ana'] });
    const result = removeMember(group, 'Zoe', { type: 'redistribute' });
    expect(result.ok ? 'ok' : result.error.code).toBe('member_not_found');
  });
});

describe('getMemberRemovalImpact', () => {
  const group = makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      { id: 'pagado', amount: 9_000, payer: 'Beto', among: ['Ana', 'Beto'] },
      { id: 'igual', amount: 6_000, payer: 'Ana', among: ['Ana', 'Beto'] },
      {
        id: 'partes',
        amount: 8_000,
        payer: 'Carla',
        among: ['Ana', 'Beto'],
        split: {
          type: 'shares',
          participantIds: ['Ana', 'Beto'],
          parts: { Ana: 2, Beto: 1 },
        },
      },
      { id: 'solo', amount: 1_000, payer: 'Ana', among: ['Beto'] },
      { id: 'ajeno', amount: 1_000, payer: 'Ana', among: ['Ana', 'Carla'] },
    ],
    payments: [{ id: 'p1', from: 'Beto', to: 'Ana', amount: 100 }],
  });

  it('separa lo que se borra, lo que se reparte y lo que pasa a montos', () => {
    const impact = unwrap(getMemberRemovalImpact(group, 'Beto'));
    expect(impact.paidExpenses.map((e) => e.id)).toEqual(['pagado']);
    expect(impact.deletedExpenses.map((e) => e.id)).toEqual(['pagado', 'solo']);
    expect(impact.redistributedExpenses.map((e) => e.id)).toEqual([
      'igual',
      'partes',
    ]);
    expect(impact.expensesConvertedToAmounts.map((e) => e.id)).toEqual([
      'partes',
    ]);
    expect(impact.payments.map((p) => p.id)).toEqual(['p1']);
    expect(impact.requiresStrategy).toBe(true);
  });

  it('un miembro sin movimientos se elimina con none', () => {
    const lonely = makeGroup({ members: ['Ana', 'Beto'] });
    expect(
      unwrap(getMemberRemovalImpact(lonely, 'Beto')).requiresStrategy
    ).toBe(false);
    expect(
      unwrap(removeMember(lonely, 'Beto', { type: 'none' })).members
    ).toHaveLength(1);
  });
});

describe('redistributeSplit', () => {
  it('devuelve el mismo split si la persona no participaba', () => {
    const split: Split = { type: 'equal', participantIds: ['Ana', 'Carla'] };
    expect(redistributeSplit({ amount: 10, split }, 'Beto', trio)).toBe(split);
  });
  it('devuelve null si nadie más participaba', () => {
    const split: Split = { type: 'equal', participantIds: ['Beto'] };
    expect(redistributeSplit({ amount: 10, split }, 'Beto', trio)).toBeNull();
  });
});
