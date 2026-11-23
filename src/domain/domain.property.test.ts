import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import { removeExpense, removeMember } from './group';
import { previewBalanceChange } from './impact';
import { computeShares } from './split';
import { groupArb, amountArb } from './test-utils/arbitraries';
import { suggestTransfers } from './transfers';
import { getGroupIssues } from './validation';
import type { Group } from './types';

const sum = (values: Iterable<number>) =>
  [...values].reduce((s, v) => s + v, 0);

/** Group plus the index of a member (and a different one, when it exists). */
const groupWithMembersArb = groupArb({ minMembers: 2 }).chain((group) =>
  fc.record({
    group: fc.constant(group),
    index: fc.integer({ min: 0, max: group.members.length - 1 }),
    offset: fc.integer({ min: 1, max: group.members.length - 1 }),
  })
);

describe('propiedades del dominio', () => {
  it('1. las partes suman el monto y difieren a lo más en $1', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        for (const expense of group.expenses) {
          const shares = [...computeShares(expense, group.members).values()];
          expect(sum(shares)).toBe(expense.amount);
          expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(
            1
          );
          expect(shares).toHaveLength(expense.split.participantIds.length);
        }
      })
    );
  });

  it('1b. el resto va a los primeros según el orden del grupo', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        for (const expense of group.expenses) {
          const inGroupOrder = group.members
            .map((m) => computeShares(expense, group.members).get(m.id))
            .filter((v): v is number => v !== undefined);
          expect([...inGroupOrder].sort((a, b) => b - a)).toEqual(inGroupOrder);
        }
      })
    );
  });

  it('2. la suma de los saldos es 0', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        expect(sum(computeBalances(group).map((b) => b.balance))).toBe(0);
      })
    );
  });

  it('3. aplicar las transferencias sugeridas deja todos los saldos en 0', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
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
      })
    );
  });

  it('4. a lo más n-1 transferencias, todas positivas y entre miembros distintos', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        const transfers = suggestTransfers(group);
        const nonZero = computeBalances(group).filter(
          (b) => b.balance !== 0
        ).length;
        expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
        for (const t of transfers) {
          expect(t.amount).toBeGreaterThan(0);
          expect(t.fromId).not.toBe(t.toId);
        }
      })
    );
  });

  it('5. todos los montos calculados son enteros', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        for (const b of computeBalances(group)) {
          for (const v of [
            b.paid,
            b.share,
            b.paymentsSent,
            b.paymentsReceived,
            b.balance,
          ]) {
            expect(Number.isSafeInteger(v)).toBe(true);
          }
        }
        for (const t of suggestTransfers(group)) {
          expect(Number.isSafeInteger(t.amount)).toBe(true);
        }
      })
    );
  });

  it('6. los cálculos son determinísticos y no mutan la entrada', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        const snapshot = structuredClone(group);
        const first = [computeBalances(group), suggestTransfers(group)];
        const second = [
          computeBalances(structuredClone(group)),
          suggestTransfers(structuredClone(group)),
        ];
        expect(second).toEqual(first);
        expect(group).toEqual(snapshot);
      })
    );
  });

  it('7a. reasignar deja un grupo válido sin referencias al miembro', () => {
    fc.assert(
      fc.property(groupWithMembersArb, ({ group, index, offset }) => {
        const removed = group.members[index].id;
        const target =
          group.members[(index + offset) % group.members.length].id;
        const result = removeMember(group, removed, {
          type: 'reassign',
          toMemberId: target,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expectNoReferences(result.value, removed);
        expect(result.value.expenses.map((e) => e.amount)).toEqual(
          group.expenses.map((e) => e.amount)
        );
      })
    );
  });

  it('7b. eliminar en cascada deja un grupo válido sin gastos sin participantes', () => {
    fc.assert(
      fc.property(groupWithMembersArb, ({ group, index }) => {
        const removed = group.members[index].id;
        const result = removeMember(group, removed, { type: 'cascade' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expectNoReferences(result.value, removed);
        expect(sum(computeBalances(result.value).map((b) => b.balance))).toBe(
          0
        );
      })
    );
  });

  it('7c. quitar con strategy none sólo funciona sin movimientos', () => {
    fc.assert(
      fc.property(groupWithMembersArb, ({ group, index }) => {
        const removed = group.members[index].id;
        const hasActivity =
          group.expenses.some(
            (e) =>
              e.payerId === removed || e.split.participantIds.includes(removed)
          ) ||
          group.payments.some(
            (p) => p.fromId === removed || p.toId === removed
          );
        const result = removeMember(group, removed, { type: 'none' });
        expect(result.ok).toBe(!hasActivity);
        if (result.ok) expectNoReferences(result.value, removed);
      })
    );
  });

  it('los generadores producen grupos válidos', () => {
    fc.assert(
      fc.property(groupArb(), (group) => getGroupIssues(group).length === 0)
    );
    fc.assert(fc.property(amountArb, (a) => Number.isSafeInteger(a) && a > 0));
  });
});

function expectNoReferences(group: Group, removedId: string) {
  expect(getGroupIssues(group)).toEqual([]);
  expect(group.members.some((m) => m.id === removedId)).toBe(false);
  for (const e of group.expenses) {
    expect(e.payerId).not.toBe(removedId);
    expect(e.split.participantIds).not.toContain(removedId);
    expect(e.split.participantIds.length).toBeGreaterThan(0);
  }
  for (const p of group.payments) {
    expect(p.fromId).not.toBe(removedId);
    expect(p.toId).not.toBe(removedId);
    expect(p.fromId).not.toBe(p.toId);
  }
}

describe('propiedades de previewBalanceChange', () => {
  it('8. comparar un grupo consigo mismo no cambia nada', () => {
    fc.assert(
      fc.property(groupArb(), (group) => {
        expect(previewBalanceChange(group, group)).toEqual([]);
      })
    );
  });

  it('8b. al eliminar un gasto, los cambios suman 0 y van en el orden del grupo', () => {
    fc.assert(
      fc.property(
        groupArb({ maxExpenses: 10 }).filter((g) => g.expenses.length > 0),
        fc.nat(),
        (group, n) => {
          const target = group.expenses[n % group.expenses.length];
          const next = removeExpense(group, target.id);
          expect(next.ok).toBe(true);
          if (!next.ok) return;
          const changes = previewBalanceChange(group, next.value);
          expect(sum(changes.map((c) => c.after - c.before))).toBe(0);
          const order = group.members.map((m) => m.id);
          const indexes = changes.map((c) => order.indexOf(c.memberId));
          expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
          expect(changes.every((c) => c.before !== c.after)).toBe(true);
        }
      )
    );
  });
});
