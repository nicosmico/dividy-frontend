import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import { removeExpense, removeMember } from './group';
import { previewBalanceChange } from './impact';
import { computeShares } from './split';
import { groupArb, splitArb } from './test-utils/arbitraries';
import { suggestTransfers } from './transfers';
import { getGroupIssues } from './validation';
import type { Expense, Group, Member, Split } from './types';

/**
 * The whole algorithm (shares → balances → suggested transfers, and removing
 * members) with every kind of split mixed in the same group. The older
 * properties in `domain.property.test.ts` only generate equal splits; these
 * run the same guarantees over exact amounts, percentages and parts, plus an
 * independent reference implementation of the division (exact fractions with
 * BigInt) and metamorphic checks between kinds of split.
 */

const ALL: Split['type'][] = ['equal', 'exact', 'percent', 'shares'];
const RUNS = { numRuns: 300 };

const mixedGroupArb = groupArb({ splits: ALL });
const mixedGroupWithMembersArb = groupArb({ splits: ALL, minMembers: 2 }).chain(
  (group) =>
    fc.record({
      group: fc.constant(group),
      index: fc.integer({ min: 0, max: group.members.length - 1 }),
      offset: fc.integer({ min: 1, max: group.members.length - 1 }),
    })
);

const sum = (values: Iterable<number>) =>
  [...values].reduce((s, v) => s + v, 0);

/**
 * Reference division, written separately from `computeShares` on purpose:
 * each participant gets the floor of `amount * weight / totalWeight` (exact,
 * with BigInt) and the leftover units go, one each, to the participants with
 * a fractional part, in the group's member order. Equal splits weigh 1 each;
 * exact amounts are returned as they are.
 */
function referenceShares(
  expense: Pick<Expense, 'amount' | 'split'>,
  members: readonly Member[]
): Map<string, number> {
  const { split, amount } = expense;
  const inSplit = new Set(split.participantIds);
  const ordered = members.filter((m) => inSplit.has(m.id)).map((m) => m.id);
  const result = new Map<string, number>();
  if (ordered.length === 0) return result;
  if (split.type === 'exact') {
    for (const id of ordered) result.set(id, split.amounts[id] ?? 0);
    return result;
  }
  const weight = (id: string): bigint => {
    switch (split.type) {
      case 'equal':
        return 1n;
      case 'percent':
        return BigInt(split.basisPoints[id] ?? 0);
      case 'shares':
        return BigInt(split.parts[id] ?? 0);
    }
  };
  const total = ordered.reduce((s, id) => s + weight(id), 0n);
  const big = BigInt(amount);
  let leftover = big;
  const withFraction: string[] = [];
  for (const id of ordered) {
    const numerator = big * weight(id);
    const floor = numerator / total;
    result.set(id, Number(floor));
    leftover -= floor;
    if (numerator % total !== 0n) withFraction.push(id);
  }
  for (const id of withFraction.slice(0, Number(leftover))) {
    result.set(id, result.get(id)! + 1);
  }
  return result;
}

const sorted = (shares: Map<string, number>) =>
  [...shares.entries()].sort(([a], [b]) => a.localeCompare(b));

describe('algoritmo completo con divisiones mezcladas', () => {
  it('la división coincide con una implementación de referencia independiente', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        for (const expense of group.expenses) {
          expect(sorted(computeShares(expense, group.members))).toEqual(
            sorted(referenceShares(expense, group.members))
          );
        }
      }),
      { numRuns: 500 }
    );
  });

  it('las partes suman el monto, son enteras y no negativas', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        for (const expense of group.expenses) {
          const shares = [...computeShares(expense, group.members).values()];
          expect(sum(shares)).toBe(expense.amount);
          expect(shares).toHaveLength(expense.split.participantIds.length);
          for (const s of shares) {
            expect(Number.isSafeInteger(s)).toBe(true);
            expect(s).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      RUNS
    );
  });

  it('la suma de los saldos es 0', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        expect(sum(computeBalances(group).map((b) => b.balance))).toBe(0);
      }),
      RUNS
    );
  });

  it('aplicar las transferencias sugeridas deja todos los saldos en 0', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        const settled: Group = {
          ...group,
          payments: [
            ...group.payments,
            ...suggestTransfers(group).map((t, i) => ({
              id: `s${i}`,
              fromId: t.fromId,
              toId: t.toId,
              amount: t.amount,
              date: '2026-01-01',
              createdAt: group.createdAt,
            })),
          ],
        };
        expect(computeBalances(settled).every((b) => b.balance === 0)).toBe(
          true
        );
      }),
      RUNS
    );
  });

  it('a lo más n-1 transferencias, enteras, positivas y entre miembros distintos', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        const transfers = suggestTransfers(group);
        const nonZero = computeBalances(group).filter(
          (b) => b.balance !== 0
        ).length;
        expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
        for (const t of transfers) {
          expect(Number.isSafeInteger(t.amount)).toBe(true);
          expect(t.amount).toBeGreaterThan(0);
          expect(t.fromId).not.toBe(t.toId);
        }
      }),
      RUNS
    );
  });

  it('los cálculos son determinísticos y no mutan la entrada', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => {
        const before = structuredClone(group);
        const first = [computeBalances(group), suggestTransfers(group)];
        const second = [
          computeBalances(structuredClone(group)),
          suggestTransfers(structuredClone(group)),
        ];
        expect(second).toEqual(first);
        expect(group).toEqual(before);
      }),
      RUNS
    );
  });

  it('reasignar deja un grupo válido, con los mismos montos y saldos que suman 0', () => {
    fc.assert(
      fc.property(mixedGroupWithMembersArb, ({ group, index, offset }) => {
        const removed = group.members[index].id;
        const target =
          group.members[(index + offset) % group.members.length].id;
        const result = removeMember(group, removed, {
          type: 'reassign',
          toMemberId: target,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(getGroupIssues(result.value)).toEqual([]);
        expect(result.value.expenses.map((e) => e.amount)).toEqual(
          group.expenses.map((e) => e.amount)
        );
        // The receiver taking over exactly the removed member's balance is
        // pending a decision: with equal splits where both took part, today
        // the expense stays "once" (ADR 0003) and third parties change.
        const after = computeBalances(result.value).map((b) => b.balance);
        expect(sum(after)).toBe(0);
      }),
      RUNS
    );
  });

  it('eliminar en cascada deja un grupo válido con saldos que suman 0', () => {
    fc.assert(
      fc.property(mixedGroupWithMembersArb, ({ group, index }) => {
        const removed = group.members[index].id;
        const result = removeMember(group, removed, { type: 'cascade' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(getGroupIssues(result.value)).toEqual([]);
        for (const e of result.value.expenses) {
          expect(e.split.participantIds).not.toContain(removed);
          expect(e.payerId).not.toBe(removed);
        }
        expect(sum(computeBalances(result.value).map((b) => b.balance))).toBe(
          0
        );
      }),
      RUNS
    );
  });

  it('al eliminar un gasto, los cambios de saldo suman 0', () => {
    fc.assert(
      fc.property(
        mixedGroupArb.filter((g) => g.expenses.length > 0),
        fc.nat(),
        (group, n) => {
          const target = group.expenses[n % group.expenses.length];
          const next = removeExpense(group, target.id);
          expect(next.ok).toBe(true);
          if (!next.ok) return;
          const changes = previewBalanceChange(group, next.value);
          expect(sum(changes.map((c) => c.after - c.before))).toBe(0);
        }
      ),
      RUNS
    );
  });

  it('los generadores producen grupos válidos con los cuatro tipos', () => {
    fc.assert(
      fc.property(mixedGroupArb, (group) => getGroupIssues(group).length === 0),
      RUNS
    );
  });
});

/** An amount and a split of it, among some of the members of a small group. */
const members: Member[] = ['A', 'B', 'C', 'D', 'E'].map((id, i) => ({
  id,
  name: id,
  avatar: { color: i, seed: id },
}));
const ids = members.map((m) => m.id);
const amountAndSplitArb = (kinds: Split['type'][]) =>
  fc
    .integer({ min: 1, max: 5_000_000 })
    .chain((amount) =>
      splitArb(amount, ids, kinds).map((split) => ({ amount, split }))
    );

describe('equivalencias entre tipos de división', () => {
  it('multiplicar todas las partes por k no cambia nada', () => {
    fc.assert(
      fc.property(
        amountAndSplitArb(['shares']),
        fc.integer({ min: 2, max: 50 }),
        ({ amount, split }, k) => {
          if (split.type !== 'shares') return;
          const scaled: Split = {
            ...split,
            parts: Object.fromEntries(
              Object.entries(split.parts).map(([id, p]) => [id, p * k])
            ),
          };
          expect(
            sorted(computeShares({ amount, split: scaled }, members))
          ).toEqual(sorted(computeShares({ amount, split }, members)));
        }
      ),
      RUNS
    );
  });

  it('porcentajes y partes con los mismos pesos dan lo mismo', () => {
    fc.assert(
      fc.property(amountAndSplitArb(['percent']), ({ amount, split }) => {
        if (split.type !== 'percent') return;
        const asParts: Split = {
          type: 'shares',
          participantIds: split.participantIds,
          parts: split.basisPoints,
        };
        expect(
          sorted(computeShares({ amount, split: asParts }, members))
        ).toEqual(sorted(computeShares({ amount, split }, members)));
      }),
      RUNS
    );
  });

  it('partes iguales a todos es lo mismo que dividir en partes iguales', () => {
    fc.assert(
      fc.property(
        amountAndSplitArb(['equal']),
        fc.integer({ min: 1, max: 9 }),
        ({ amount, split }, part) => {
          const asParts: Split = {
            type: 'shares',
            participantIds: split.participantIds,
            parts: Object.fromEntries(
              split.participantIds.map((id) => [id, part])
            ),
          };
          expect(
            sorted(computeShares({ amount, split: asParts }, members))
          ).toEqual(sorted(computeShares({ amount, split }, members)));
        }
      ),
      RUNS
    );
  });

  it('montos exactos con lo que calculó otra división dan lo mismo', () => {
    fc.assert(
      fc.property(amountAndSplitArb(ALL), ({ amount, split }) => {
        const shares = computeShares({ amount, split }, members);
        const asExact: Split = {
          type: 'exact',
          participantIds: split.participantIds,
          amounts: Object.fromEntries(shares),
        };
        expect(
          sorted(computeShares({ amount, split: asExact }, members))
        ).toEqual(sorted(shares));
      }),
      RUNS
    );
  });

  it('el orden de los participantes en la división no cambia el resultado', () => {
    fc.assert(
      fc.property(amountAndSplitArb(ALL), ({ amount, split }) => {
        const reversed: Split = {
          ...split,
          participantIds: [...split.participantIds].reverse(),
        };
        expect(
          sorted(computeShares({ amount, split: reversed }, members))
        ).toEqual(sorted(computeShares({ amount, split }, members)));
      }),
      RUNS
    );
  });
});
