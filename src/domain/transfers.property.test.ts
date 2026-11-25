import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import { groupArb } from './test-utils/arbitraries';
import { greedyTransfers } from './test-utils/greedy-transfers';
import {
  MAX_PEOPLE_FOR_SPLITTING,
  settleBalances,
  suggestTransfers,
  type SuggestedTransfer,
} from './transfers';

const RUNS = { numRuns: 300 };
type Balances = { id: string; balance: number }[];

/** Turns a list of values into balances p0..pN, closing the sum with one more. */
const closeSum = (values: number[]): Balances => {
  const total = values.reduce((s, v) => s + v, 0);
  return [...values, -total].map((balance, i) => ({ id: `p${i}`, balance }));
};

/** Wide balances that sum to 0 (up to the limit of step 1). */
const wideBalancesArb: fc.Arbitrary<Balances> = fc
  .array(fc.integer({ min: -200_000, max: 200_000 }), {
    minLength: 1,
    maxLength: MAX_PEOPLE_FOR_SPLITTING - 1,
  })
  .map(closeSum);

/** Small values: zero-sum subgroups (and zero balances) are common. */
const smallBalancesArb: fc.Arbitrary<Balances> = fc
  .array(fc.integer({ min: -6, max: 6 }), { minLength: 1, maxLength: 12 })
  .map(closeSum);

const balancesArb = fc.oneof(wideBalancesArb, smallBalancesArb);

function checkTransfers(balances: Balances, transfers: SuggestedTransfer[]) {
  const byId = new Map(balances.map((b) => [b.id, b.balance]));
  const left = new Map(byId);
  for (const t of transfers) {
    expect(Number.isSafeInteger(t.amount)).toBe(true);
    expect(t.amount).toBeGreaterThan(0);
    expect(t.fromId).not.toBe(t.toId);
    expect(byId.get(t.fromId)!).toBeLessThan(0);
    expect(byId.get(t.toId)!).toBeGreaterThan(0);
    left.set(t.fromId, left.get(t.fromId)! + t.amount);
    left.set(t.toId, left.get(t.toId)! - t.amount);
  }
  expect([...left.values()].every((v) => v === 0)).toBe(true);
  const people = balances.filter((b) => b.balance !== 0).length;
  expect(transfers.length).toBeLessThanOrEqual(Math.max(0, people - 1));
}

/**
 * 200 ms normally. Mutation testing runs instrumented code several times
 * slower and sets `PERF_BUDGET_MS` (vitest.mutation.config.ts).
 */
const TIME_BUDGET_MS = Number(process.env.PERF_BUDGET_MS ?? 200);

describe('transferencias sugeridas: propiedades', () => {
  it('con grupos de todo tipo de división: saldan, tienen buena forma y no superan al voraz', () => {
    fc.assert(
      fc.property(
        groupArb({ splits: ['equal', 'exact', 'percent', 'shares'] }),
        (group) => {
          const balances = computeBalances(group).map((b) => ({
            id: b.memberId,
            balance: b.balance,
          }));
          const transfers = suggestTransfers(group);
          checkTransfers(balances, transfers);
          expect(transfers.length).toBeLessThanOrEqual(
            greedyTransfers(balances).length
          );
          expect(suggestTransfers(structuredClone(group))).toEqual(transfers);
        }
      ),
      RUNS
    );
  });

  it('con saldos generados que suman 0: saldan, tienen buena forma, son deterministas y no superan al voraz', () => {
    fc.assert(
      fc.property(balancesArb, (balances) => {
        const transfers = settleBalances(balances);
        checkTransfers(balances, transfers);
        expect(transfers.length).toBeLessThanOrEqual(
          greedyTransfers(balances).length
        );
        expect(settleBalances(structuredClone(balances))).toEqual(transfers);
      }),
      { numRuns: 1000 }
    );
  });

  it('con un solo acreedor cada deudor paga una vez; con un solo deudor, una vez a cada acreedor', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100_000 }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.boolean(),
        (values, creditorIsOne) => {
          const sign = creditorIsOne ? -1 : 1;
          const balances = closeSum(values.map((v) => sign * v));
          const transfers = settleBalances(balances);
          checkTransfers(balances, transfers);
          expect(transfers).toHaveLength(values.length);
          const side = creditorIsOne ? 'fromId' : 'toId';
          expect(new Set(transfers.map((t) => t[side])).size).toBe(
            values.length
          );
        }
      ),
      RUNS
    );
  });

  it('el mínimo: nada más corto saldan los subgrupos que se saldan solos (parejas exactas)', () => {
    // k independent pairs (a debt equal to a credit) need exactly k transfers.
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100_000 }), {
          minLength: 1,
          maxLength: 7,
        }),
        (amounts) => {
          const balances = amounts.flatMap((a, i) => [
            { id: `d${i}`, balance: -a },
            { id: `c${i}`, balance: a },
          ]);
          expect(settleBalances(balances)).toHaveLength(amounts.length);
        }
      ),
      RUNS
    );
  });
});

describe('transferencias sugeridas: rendimiento', () => {
  /** Balances with no zero-sum subgroup: powers-like values and one closing. */
  const people = (n: number): Balances =>
    closeSum(
      Array.from(
        { length: n - 1 },
        (_, i) => (i % 2 === 0 ? 1 : -1) * (1000 + i * 7919 + ((i * i) % 13))
      )
    );

  it(`${MAX_PEOPLE_FOR_SPLITTING} personas con saldo corren en menos de 200 ms`, () => {
    const balances = people(MAX_PEOPLE_FOR_SPLITTING);
    const start = performance.now();
    const transfers = settleBalances(balances);
    expect(performance.now() - start).toBeLessThan(TIME_BUDGET_MS);
    checkTransfers(balances, transfers);
  });

  it('40 personas con saldo (sin el paso 1) corren en menos de 200 ms', () => {
    const balances = people(40);
    const start = performance.now();
    const transfers = settleBalances(balances);
    expect(performance.now() - start).toBeLessThan(TIME_BUDGET_MS);
    checkTransfers(balances, transfers);
  });
});
