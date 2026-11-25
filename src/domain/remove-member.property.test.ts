import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeBalances } from './balances';
import { removeMember } from './group';
import { computeShares } from './split';
import { groupArb } from './test-utils/arbitraries';
import type { Group, Split } from './types';
import { getGroupIssues } from './validation';

/**
 * Properties of removing a member by dividing their share among the others
 * (ADR 0010), over groups with the four kinds of split.
 */

const ALL: Split['type'][] = ['equal', 'exact', 'percent', 'shares'];
const RUNS = { numRuns: 500 };

const groupWithMemberArb = groupArb({ splits: ALL, minMembers: 2 }).chain(
  (group) =>
    fc.record({
      group: fc.constant(group),
      index: fc.integer({ min: 0, max: group.members.length - 1 }),
    })
);

const sum = (values: Iterable<number>) =>
  [...values].reduce((s, v) => s + v, 0);

function remove(group: Group, id: string): Group {
  const result = removeMember(group, id, { type: 'redistribute' });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('eliminar un miembro repartiendo su parte (propiedades)', () => {
  it('deja un grupo válido, sin el miembro, con saldos que suman 0', () => {
    fc.assert(
      fc.property(groupWithMemberArb, ({ group, index }) => {
        const id = group.members[index].id;
        const next = remove(group, id);
        expect(getGroupIssues(next)).toEqual([]);
        expect(next.members.map((m) => m.id)).not.toContain(id);
        expect(sum(computeBalances(next).map((b) => b.balance))).toBe(0);
        for (const e of next.expenses) {
          expect(e.payerId).not.toBe(id);
          expect(e.split.participantIds).not.toContain(id);
          expect(e.split.participantIds.length).toBeGreaterThan(0);
        }
        for (const p of next.payments) {
          expect([p.fromId, p.toId]).not.toContain(id);
        }
      }),
      RUNS
    );
  });

  it('en cada gasto que sobrevive, lo de los demás sube exactamente lo que tenía el eliminado', () => {
    fc.assert(
      fc.property(groupWithMemberArb, ({ group, index }) => {
        const id = group.members[index].id;
        const next = remove(group, id);
        const after = new Map(next.expenses.map((e) => [e.id, e]));
        for (const before of group.expenses) {
          const kept = after.get(before.id);
          const wasIn = before.split.participantIds.includes(id);
          if (!kept) {
            // deleted: they paid it, or nobody else took part
            expect(
              before.payerId === id ||
                before.split.participantIds.every((p) => p === id)
            ).toBe(true);
            continue;
          }
          // the amount, payer, date and description do not change
          expect({ ...kept, split: null }).toEqual({ ...before, split: null });
          if (!wasIn) {
            expect(kept).toBe(before);
            continue;
          }
          const sharesBefore = computeShares(before, group.members);
          const sharesAfter = computeShares(kept, next.members);
          const removed = sharesBefore.get(id)!;
          const others = [...sharesBefore.keys()].filter((p) => p !== id);
          // Someone dropped from a shares expense (their amount would be 0)
          // stays at 0: it is not in the new split, so read it as 0.
          const increases = others.map(
            (p) => (sharesAfter.get(p) ?? 0) - sharesBefore.get(p)!
          );
          expect(sum(increases)).toBe(removed);
          // Each one takes an equal part of it: within 1 unit, or within the
          // granularity of a basis point (0,01 %) of the amount for percentages.
          const tolerance =
            kept.split.type === 'percent' ? before.amount / 10_000 + 2 : 1;
          for (const increase of increases) {
            expect(
              Math.abs(increase - removed / others.length)
            ).toBeLessThanOrEqual(tolerance);
          }
          // The split keeps its kind, except parts that become amounts.
          expect(kept.split.type).toBe(
            before.split.type === 'shares' ? 'exact' : before.split.type
          );
          // Whoever was not in the expense is still not in it.
          for (const p of kept.split.participantIds) {
            expect(before.split.participantIds).toContain(p);
          }
        }
      }),
      RUNS
    );
  });

  it('quienes no compartían ningún gasto ni pago con el eliminado mantienen su saldo', () => {
    fc.assert(
      fc.property(groupWithMemberArb, ({ group, index }) => {
        const id = group.members[index].id;
        const involved = new Set<string>();
        for (const e of group.expenses) {
          const everyone = [e.payerId, ...e.split.participantIds];
          if (everyone.includes(id)) everyone.forEach((p) => involved.add(p));
        }
        for (const p of group.payments) {
          if (p.fromId === id || p.toId === id) {
            involved.add(p.fromId);
            involved.add(p.toId);
          }
        }
        const before = new Map(
          computeBalances(group).map((b) => [b.memberId, b.balance])
        );
        for (const b of computeBalances(remove(group, id))) {
          if (!involved.has(b.memberId)) {
            expect(b.balance).toBe(before.get(b.memberId));
          }
        }
      }),
      RUNS
    );
  });

  it('no muta el grupo original', () => {
    fc.assert(
      fc.property(groupWithMemberArb, ({ group, index }) => {
        const copy = structuredClone(group);
        remove(group, group.members[index].id);
        expect(group).toEqual(copy);
      }),
      RUNS
    );
  });
});
