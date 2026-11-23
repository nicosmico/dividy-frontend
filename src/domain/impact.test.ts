import { describe, expect, it } from 'vitest';
import { removeExpense, updateExpense } from './group';
import { isExpenseCoveredByPayments, previewBalanceChange } from './impact';
import { makeGroup } from './test-utils/fixtures';

const EARLY = '2026-01-01T10:00:00.000Z';
const LATE = '2026-01-01T11:00:00.000Z';

/** Ana pays $10.000 among three; Beto and Carla pay $3.333 each afterwards. */
function paidGroup() {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: [
      {
        id: 'e1',
        description: 'Supermercado',
        amount: 10_000,
        payer: 'Ana',
        among: ['Ana', 'Beto', 'Carla'],
        createdAt: EARLY,
      },
    ],
    payments: [
      { from: 'Beto', to: 'Ana', amount: 3333, createdAt: LATE },
      { from: 'Carla', to: 'Ana', amount: 3333, createdAt: LATE },
    ],
  });
}

describe('isExpenseCoveredByPayments', () => {
  it.each([
    {
      caso: 'hay pagos posteriores al gasto',
      group: paidGroup(),
      expected: true,
    },
    {
      caso: 'el gasto se creó después del último pago',
      group: makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          {
            id: 'e1',
            amount: 1000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
            createdAt: LATE,
          },
        ],
        payments: [{ from: 'Beto', to: 'Ana', amount: 100, createdAt: EARLY }],
      }),
      expected: false,
    },
    {
      caso: 'el pago se creó en el mismo instante que el gasto',
      group: makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [
          {
            id: 'e1',
            amount: 1000,
            payer: 'Ana',
            among: ['Ana', 'Beto'],
            createdAt: EARLY,
          },
        ],
        payments: [{ from: 'Beto', to: 'Ana', amount: 100, createdAt: EARLY }],
      }),
      expected: false,
    },
    {
      caso: 'el grupo no tiene pagos',
      group: makeGroup({
        members: ['Ana', 'Beto'],
        expenses: [{ id: 'e1', amount: 1000, payer: 'Ana', among: ['Ana'] }],
      }),
      expected: false,
    },
  ])('$caso: $expected', ({ group, expected }) => {
    expect(isExpenseCoveredByPayments(group, 'e1')).toBe(expected);
  });

  it('es falso si el gasto no existe', () => {
    expect(isExpenseCoveredByPayments(paidGroup(), 'nope')).toBe(false);
  });
});

describe('previewBalanceChange', () => {
  it('el ejemplo: eliminar el gasto ya pagado deja a Ana debiendo $6.666', () => {
    const group = paidGroup();
    const next = removeExpense(group, 'e1');
    if (!next.ok) throw new Error('unexpected');
    expect(previewBalanceChange(group, next.value)).toEqual([
      { memberId: 'Ana', before: 0, after: -6666 },
      { memberId: 'Beto', before: 0, after: 3333 },
      { memberId: 'Carla', before: 0, after: 3333 },
    ]);
  });

  it('un grupo sin pagos: eliminar el gasto solo quita lo que se debía', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        { id: 'e1', amount: 1000, payer: 'Ana', among: ['Ana', 'Beto'] },
      ],
    });
    const next = removeExpense(group, 'e1');
    if (!next.ok) throw new Error('unexpected');
    expect(previewBalanceChange(group, next.value)).toEqual([
      { memberId: 'Ana', before: 500, after: 0 },
      { memberId: 'Beto', before: -500, after: 0 },
    ]);
  });

  it('una edición que no cambia saldos (solo la descripción) da lista vacía', () => {
    const group = paidGroup();
    const next = updateExpense(group, 'e1', {
      description: 'Súper',
      amount: 10_000,
      payerId: 'Ana',
      split: { type: 'equal', participantIds: ['Ana', 'Beto', 'Carla'] },
      date: '2026-01-01',
    });
    if (!next.ok) throw new Error('unexpected');
    expect(previewBalanceChange(group, next.value)).toEqual([]);
  });

  it('respeta el orden del grupo y omite a quien no cambia', () => {
    const group = paidGroup();
    const next = updateExpense(group, 'e1', {
      description: 'Supermercado',
      amount: 10_000,
      payerId: 'Ana',
      split: { type: 'equal', participantIds: ['Ana', 'Beto'] },
      date: '2026-01-01',
    });
    if (!next.ok) throw new Error('unexpected');
    const changes = previewBalanceChange(group, next.value);
    expect(changes.map((c) => c.memberId)).toEqual(['Ana', 'Beto', 'Carla']);
    expect(changes.every((c) => c.before !== c.after)).toBe(true);
  });
});
