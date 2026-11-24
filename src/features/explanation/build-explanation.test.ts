import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeBalances, type Group } from '@/domain';
import { groupArb } from '@/domain/test-utils/arbitraries';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation, buildLegend } from './build-explanation';
import { colorForRank } from './colors';
import { buildExampleGroup, settleGroup } from './example-group';

const sum = (items: { amount: number }[]) =>
  items.reduce((total, item) => total + item.amount, 0);

/** n expenses of decreasing amount, so rank i = expense i. */
function manyExpenses(n: number): Group {
  return makeGroup({
    members: ['Ana', 'Beto', 'Carla'],
    expenses: Array.from({ length: n }, (_, i) => ({
      id: `e${i + 1}`,
      description: `Gasto ${i + 1}`,
      amount: (n - i) * 1000,
      payer: ['Ana', 'Beto', 'Carla'][i % 3],
      among: ['Ana', 'Beto', 'Carla'],
    })),
  });
}

describe('colorForRank (decisión 92)', () => {
  it.each([
    [0, { kind: 'solid', slot: 1 }],
    [5, { kind: 'solid', slot: 6 }],
    [6, { kind: 'striped', slot: 1 }],
    [11, { kind: 'striped', slot: 6 }],
    [12, { kind: 'other' }],
    [40, { kind: 'other' }],
  ])('rank %i', (rank, expected) => {
    expect(colorForRank(rank)).toEqual(expected);
  });
});

describe('buildExplanation, ejemplo de la bienvenida', () => {
  const example = buildExampleGroup();
  const explanation = buildExplanation(example);
  const byName = (name: string) =>
    explanation.members.find((m) => m.member.name === name)!;

  it('ordena los gastos por monto y les asigna color sólido', () => {
    expect(
      explanation.expenses.map((e) => [e.description, e.amount, e.color])
    ).toEqual([
      ['Alojamiento', 45000, { kind: 'solid', slot: 1 }],
      ['Carne', 30000, { kind: 'solid', slot: 2 }],
      ['Bebidas', 15000, { kind: 'solid', slot: 3 }],
    ]);
    expect(explanation.totalSpent).toBe(90000);
  });

  it('desglosa lo que pagó cada uno', () => {
    expect(byName('Ana').paid).toBe(30000);
    expect(byName('Ana').paidSlices).toEqual([
      { expenseId: 'example-e1', amount: 30000 },
    ]);
    expect(byName('Beto').paidSlices).toEqual([
      { expenseId: 'example-e3', amount: 45000 },
    ]);
    expect(byName('Carla').paidSlices).toEqual([
      { expenseId: 'example-e2', amount: 15000 },
    ]);
  });

  it('desglosa su parte por gasto con el dominio', () => {
    expect(byName('Ana').shareSlices).toEqual([
      { expenseId: 'example-e3', amount: 15000 },
      { expenseId: 'example-e1', amount: 10000 },
    ]);
    expect(byName('Carla').shareSlices).toEqual([
      { expenseId: 'example-e3', amount: 15000 },
      { expenseId: 'example-e1', amount: 10000 },
      { expenseId: 'example-e2', amount: 7500 },
    ]);
    expect(explanation.members.map((m) => m.share)).toEqual([
      25000, 32500, 32500,
    ]);
  });

  it('trae los saldos y las transferencias sugeridas', () => {
    expect(explanation.members.map((m) => m.balance)).toEqual([
      5000, 12500, -17500,
    ]);
    expect(explanation.transfers).toEqual([
      { fromId: 'carla', toId: 'beto', amount: 12500 },
      { fromId: 'carla', toId: 'ana', amount: 5000 },
    ]);
    expect(explanation.scaleMax).toBe(45000);
  });

  it('tras registrar las transferencias sugeridas queda saldado', () => {
    const settled = buildExplanation(settleGroup(example));
    expect(settled.members.map((m) => m.balance)).toEqual([0, 0, 0]);
    expect(settled.transfers).toEqual([]);
    expect(settled.payments).toHaveLength(2);
  });
});

describe('buildExplanation, más de 12 gastos', () => {
  const explanation = buildExplanation(manyExpenses(14));

  it('asigna sólidos, rayas y "Otros" según el rango', () => {
    const kinds = explanation.expenses.map((e) => e.color.kind);
    expect(kinds).toEqual([
      ...Array<string>(6).fill('solid'),
      ...Array<string>(6).fill('striped'),
      'other',
      'other',
    ]);
    expect(explanation.expenses[0].color).toEqual({ kind: 'solid', slot: 1 });
    expect(explanation.expenses[6].color).toEqual({
      kind: 'striped',
      slot: 1,
    });
    expect(explanation.expenses[11].color).toEqual({
      kind: 'striped',
      slot: 6,
    });
  });

  it('agrupa lo que sobra en una fila "Otros" de la leyenda', () => {
    const legend = buildLegend(explanation);
    expect(legend).toHaveLength(13);
    expect(legend[0].label).toBe('Gasto 1');
    expect(legend[12]).toMatchObject({
      key: 'others',
      label: 'Otros (2 gastos)',
      total: 2000 + 1000,
      color: { kind: 'other' },
      expense: null,
    });
  });

  it('sin más de 12 gastos no hay fila "Otros"', () => {
    expect(buildLegend(buildExplanation(manyExpenses(12)))).toHaveLength(12);
  });
});

describe('buildExplanation, desempates', () => {
  it('a igual monto ordena por createdAt y luego por id', () => {
    const group = makeGroup({
      members: ['Ana', 'Beto'],
      expenses: [
        {
          id: 'b',
          amount: 1000,
          payer: 'Ana',
          among: ['Ana'],
          createdAt: '2026-01-02T00:00:00.000Z',
        },
        {
          id: 'a',
          amount: 1000,
          payer: 'Ana',
          among: ['Ana'],
          createdAt: '2026-01-02T00:00:00.000Z',
        },
        {
          id: 'c',
          amount: 1000,
          payer: 'Ana',
          among: ['Ana'],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(buildExplanation(group).expenses.map((e) => e.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('un grupo sin gastos devuelve todo vacío', () => {
    const e = buildExplanation(makeGroup({ members: ['Ana', 'Beto'] }));
    expect(e.expenses).toEqual([]);
    expect(e.scaleMax).toBe(0);
    expect(e.transfers).toEqual([]);
    expect(buildLegend(e)).toEqual([]);
  });

  it('el ícono sale de la descripción', () => {
    const group = makeGroup({
      members: ['Ana'],
      expenses: [
        {
          description: 'Uber al terminal',
          amount: 5000,
          payer: 'Ana',
          among: ['Ana'],
        },
      ],
    });
    expect(buildExplanation(group).expenses[0].icon).toBe('taxi');
  });
});

describe('buildExplanation, propiedades', () => {
  const groups = groupArb({ maxMembers: 6, maxExpenses: 16 });

  it('la suma de los tramos de "pagó" es lo que pagó cada uno', () => {
    fc.assert(
      fc.property(groups, (group) => {
        for (const m of buildExplanation(group).members) {
          expect(sum(m.paidSlices)).toBe(m.paid);
        }
      })
    );
  });

  it('la suma de los tramos de "su parte" es su parte', () => {
    fc.assert(
      fc.property(groups, (group) => {
        for (const m of buildExplanation(group).members) {
          expect(sum(m.shareSlices)).toBe(m.share);
        }
      })
    );
  });

  it('pagado − parte + enviados − recibidos es el saldo del dominio', () => {
    fc.assert(
      fc.property(groups, (group) => {
        const balances = new Map(
          computeBalances(group).map((b) => [b.memberId, b.balance])
        );
        for (const m of buildExplanation(group).members) {
          expect(
            sum(m.paidSlices) -
              sum(m.shareSlices) +
              m.paymentsSent -
              m.paymentsReceived
          ).toBe(m.balance);
          expect(m.balance).toBe(balances.get(m.member.id));
        }
      })
    );
  });

  it('cada gasto recibe exactamente un color, según su rango', () => {
    fc.assert(
      fc.property(groups, (group) => {
        const explanation = buildExplanation(group);
        expect(explanation.colors.size).toBe(group.expenses.length);
        explanation.expenses.forEach((e, i) => {
          expect(e.rank).toBe(i);
          expect(explanation.colors.get(e.id)).toEqual(colorForRank(i));
          const expected = i < 6 ? 'solid' : i < 12 ? 'striped' : 'other';
          expect(e.color.kind).toBe(expected);
        });
        // Sorted by amount, biggest first.
        for (let i = 1; i < explanation.expenses.length; i++) {
          expect(explanation.expenses[i - 1].amount).toBeGreaterThanOrEqual(
            explanation.expenses[i].amount
          );
        }
      })
    );
  });

  it('la escala común alcanza a todas las barras', () => {
    fc.assert(
      fc.property(groups, (group) => {
        const explanation = buildExplanation(group);
        for (const m of explanation.members) {
          expect(m.paid).toBeLessThanOrEqual(explanation.scaleMax);
          expect(m.share).toBeLessThanOrEqual(explanation.scaleMax);
        }
      })
    );
  });
});
