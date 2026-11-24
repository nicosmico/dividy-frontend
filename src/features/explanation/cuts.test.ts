import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { makeGroup } from '@/domain/test-utils/fixtures';
import { buildExplanation } from './build-explanation';
import { computeCuts, describeDivision, MIN_PART_PX } from './cuts';

function explained(amount: number, among: string[]) {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const group = makeGroup({
    members: names,
    expenses: [{ id: 'e1', amount, payer: 'A', among }],
  });
  return buildExplanation(group).expenses[0];
}

describe('computeCuts', () => {
  it('parte igual entre 5: cuatro cortes parejos', () => {
    const cuts = computeCuts(explained(150000, ['A', 'B', 'C', 'D', 'E']), 300);
    expect(cuts).toEqual([0.2, 0.4, 0.6, 0.8]);
  });

  it('con resto, las primeras partes pesan un peso más y mueven los cortes', () => {
    // 10.000 / 3 = 3.334 + 3.333 + 3.333
    const cuts = computeCuts(explained(10000, ['A', 'B', 'C']), 300);
    expect(cuts).toHaveLength(2);
    expect(cuts[0]).toBeCloseTo(3334 / 10000, 10);
    expect(cuts[1]).toBeCloseTo(6667 / 10000, 10);
  });

  it('no dibuja cortes si la parte más angosta mide menos de ~6 px', () => {
    const expense = explained(150000, ['A', 'B', 'C', 'D', 'E']);
    // each part = 20% of the segment
    expect(computeCuts(expense, 29)).toEqual([]);
    expect(computeCuts(expense, 30)).toHaveLength(4);
    expect(MIN_PART_PX).toBe(6);
  });

  it('con una sola persona no hay nada que cortar', () => {
    expect(computeCuts(explained(5000, ['A']), 500)).toEqual([]);
  });

  it('propiedad: n-1 cortes crecientes dentro de (0, 1), o ninguno', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1_000_000 }),
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 2000 }),
        (amount, n, px) => {
          const among = [
            'A',
            'B',
            'C',
            'D',
            'E',
            'F',
            'G',
            'H',
            'I',
            'J',
          ].slice(0, n);
          const cuts = computeCuts(explained(amount, among), px);
          if (cuts.length === 0) return;
          expect(cuts).toHaveLength(n - 1);
          cuts.forEach((c, i) => {
            expect(c).toBeGreaterThan(i === 0 ? 0 : cuts[i - 1]);
            expect(c).toBeLessThan(1);
          });
        }
      )
    );
  });
});

describe('describeDivision', () => {
  it.each([
    [150000, ['A', 'B', 'C', 'D', 'E'], 'entre 5: $30.000 c/u'],
    [10000, ['A', 'B', 'C'], 'entre 3: $3.334 / $3.333 / $3.333'],
    [9000, ['A', 'B'], 'entre 2: $4.500 c/u'],
  ])('%i entre %j', (amount, among, text) => {
    expect(describeDivision(explained(amount, among))).toBe(text);
  });

  it('una sola persona: no hay división', () => {
    expect(describeDivision(explained(5000, ['A']))).toBeNull();
  });

  it('con muchas partes agrupa las iguales', () => {
    const among = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    expect(describeDivision(explained(10002, among))).toBe(
      'entre 10: $1.001 (2) / $1.000 (8)'
    );
  });

  it('cuenta también a quienes les toca $0', () => {
    expect(describeDivision(explained(2, ['A', 'B', 'C']))).toBe(
      'entre 3: $1 / $1 / $0'
    );
  });
});
