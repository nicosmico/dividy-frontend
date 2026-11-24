import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { groupArb } from '@/domain/test-utils/arbitraries';
import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation } from './build-explanation';
import { buildExampleGroup } from './example-group';
import { narrateShareStep } from './narration';
import { buildShareSteps } from './share-steps';

const names = ['Ana', 'Beto', 'Carla'];

function groupWith(amounts: number[], among = names) {
  return makeGroup({
    members: names,
    expenses: amounts.map((amount, i) => ({
      id: `e${i + 1}`,
      description: `Gasto ${i + 1}`,
      amount,
      payer: names[i % 3],
      among,
    })),
  });
}

const texts = (group: ReturnType<typeof groupWith>) => {
  const explanation = buildExplanation(group);
  return buildShareSteps(explanation).map((step) =>
    narrateShareStep(explanation, step)
  );
};

const groups = groupArb({ maxMembers: 6, maxExpenses: 16 });

describe('buildShareSteps', () => {
  it('el ejemplo de la bienvenida: tres sub-pasos, del gasto más grande al más chico', () => {
    const explanation = buildExplanation(buildExampleGroup());
    const steps = buildShareSteps(explanation);
    expect(steps.map((s) => s.expenseIds)).toEqual([
      ['example-e3'],
      ['example-e1'],
      ['example-e2'],
    ]);
    expect(steps.map((s) => s.kind)).toEqual(['expense', 'expense', 'expense']);
    expect(steps.map((s) => s.revealedIds.length)).toEqual([1, 2, 3]);
    expect(texts(buildExampleGroup())).toEqual([
      'Beto pagó Alojamiento ($45.000). Se divide entre 3: $15.000 cada uno.',
      'Ana pagó Carne ($30.000). Se divide entre 3: $10.000 cada uno.',
      'Carla pagó Bebidas ($15.000). Se divide entre 2: $7.500 cada uno.',
    ]);
  });

  it('sin gastos no hay sub-pasos', () => {
    expect(buildShareSteps(buildExplanation(groupWith([])))).toEqual([]);
  });

  it('con resto, la narración dice a quién le toca $1 más (según el orden del grupo)', () => {
    expect(texts(groupWith([10000]))).toEqual([
      'Ana pagó Gasto 1 ($10.000). Se divide entre 3: $3.333 cada uno. A Ana le toca $1 más por redondeo.',
    ]);
    expect(texts(groupWith([10001]))).toEqual([
      'Ana pagó Gasto 1 ($10.001). Se divide entre 3: $3.333 cada uno. A Ana y Beto les toca $1 más por redondeo.',
    ]);
  });

  it('un gasto de una sola persona dice quién lo paga', () => {
    expect(texts(groupWith([5000], ['Beto']))).toEqual([
      'Ana pagó Gasto 1 ($5.000). Solo lo paga Beto.',
    ]);
  });

  it.each([
    [6, 6, 0],
    [7, 6, 1],
    [14, 6, 8],
  ])(
    '%i gastos: %i uno por uno y %i en el último sub-paso',
    (n, single, rest) => {
      const amounts = Array.from({ length: n }, (_, i) => (n - i) * 1000);
      const explanation = buildExplanation(groupWith(amounts));
      const steps = buildShareSteps(explanation);
      expect(steps.filter((s) => s.kind === 'expense')).toHaveLength(single);
      const last = steps[steps.length - 1];
      if (rest === 0) {
        expect(last.kind).toBe('expense');
      } else {
        expect(last.kind).toBe('rest');
        expect(last.expenseIds).toHaveLength(rest);
        expect(narrateShareStep(explanation, last)).toContain(
          rest === 1 ? 'El otro gasto' : `Los otros ${rest} gastos`
        );
      }
      // The individual ones are the 6 biggest (the solid-colored).
      expect(
        steps
          .filter((s) => s.kind === 'expense')
          .every(
            (s) =>
              explanation.expenses.findIndex((e) => e.id === s.expenseIds[0]) <
              6
          )
      ).toBe(true);
    }
  );

  it('propiedad: tras el último sub-paso, los tramos de "Su parte" de cada miembro suman su parte', () => {
    fc.assert(
      fc.property(groups, (group) => {
        const explanation = buildExplanation(group);
        const steps = buildShareSteps(explanation);
        const revealed = new Set(steps.at(-1)?.revealedIds ?? []);
        for (const m of explanation.members) {
          const sum = m.shareSlices
            .filter((s) => revealed.has(s.expenseId))
            .reduce((total, s) => total + s.amount, 0);
          expect(sum).toBe(m.share);
        }
        // Each sub-step reveals only new expenses, in order.
        steps.forEach((step, i) => {
          expect(step.revealedIds.length).toBeGreaterThanOrEqual(
            i < 6 ? i + 1 : 7
          );
        });
      })
    );
  });

  it('propiedad: las partes de cada gasto suman su monto', () => {
    fc.assert(
      fc.property(groups, (group) => {
        for (const e of buildExplanation(group).expenses) {
          expect(e.shares.reduce((t, s) => t + s.amount, 0)).toBe(e.amount);
        }
      })
    );
  });
});
