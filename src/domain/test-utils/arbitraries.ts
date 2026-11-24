import fc from 'fast-check';
import { AVATAR_COLOR_COUNT } from '../avatar';
import { MAX_AMOUNT } from '../money';
import type { Expense, Group, Member, Payment } from '../types';

const BASE_TIME = '2026-01-01T12:00:00.000Z';

/** Amounts mixing small values (lots of remainders) and the whole valid range. */
export const amountArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: 1, max: 50 }),
  fc.integer({ min: 1, max: 100_000 }),
  fc.integer({ min: 1, max: MAX_AMOUNT })
);

export const dateArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  );

/** Members with unique ids and names (`m0`, `m1`...). */
export function membersArb(min = 1, max = 8): fc.Arbitrary<Member[]> {
  return fc.integer({ min, max }).map((n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `m${i}`,
      name: `Miembro ${i}`,
      avatar: { color: i % AVATAR_COLOR_COUNT, seed: `m${i}` },
    }))
  );
}

function expenseArb(members: Member[], index: number): fc.Arbitrary<Expense> {
  const ids = members.map((m) => m.id);
  return fc
    .record({
      amount: amountArb,
      payerId: fc.constantFrom(...ids),
      participantIds: fc.uniqueArray(fc.constantFrom(...ids), {
        minLength: 1,
        maxLength: ids.length,
      }),
      date: dateArb,
    })
    .map(({ amount, payerId, participantIds, date }) => ({
      id: `e${index}`,
      description: `Gasto ${index}`,
      amount,
      payerId,
      split: { type: 'equal' as const, participantIds },
      date,
      createdAt: BASE_TIME,
    }));
}

function paymentArb(members: Member[], index: number): fc.Arbitrary<Payment> {
  const ids = members.map((m) => m.id);
  return fc
    .record({
      fromIndex: fc.integer({ min: 0, max: ids.length - 1 }),
      offset: fc.integer({ min: 1, max: Math.max(1, ids.length - 1) }),
      amount: amountArb,
      date: dateArb,
    })
    .map(({ fromIndex, offset, amount, date }) => ({
      id: `p${index}`,
      fromId: ids[fromIndex],
      toId: ids[(fromIndex + offset) % ids.length],
      amount,
      date,
      createdAt: BASE_TIME,
    }));
}

/**
 * Valid groups: unique members, expenses with an existing payer and at least
 * one participant (participants in arbitrary order), and payments between
 * different members. Payments need >= 2 members.
 */
export function groupArb(
  options: {
    minMembers?: number;
    maxMembers?: number;
    maxExpenses?: number;
    maxPayments?: number;
  } = {}
): fc.Arbitrary<Group> {
  const {
    minMembers = 1,
    maxMembers = 8,
    maxExpenses = 10,
    maxPayments = 5,
  } = options;
  return membersArb(minMembers, maxMembers).chain((members) =>
    fc
      .record({
        expenses: fc
          .integer({ min: 0, max: maxExpenses })
          .chain((n) =>
            fc.tuple(
              ...Array.from({ length: n }, (_, i) => expenseArb(members, i))
            )
          ),
        payments: fc
          .integer({ min: 0, max: members.length >= 2 ? maxPayments : 0 })
          .chain((n) =>
            fc.tuple(
              ...Array.from({ length: n }, (_, i) => paymentArb(members, i))
            )
          ),
      })
      .map(({ expenses, payments }) => ({
        id: 'g1',
        name: 'Grupo',
        currency: 'CLP' as const,
        members,
        expenses,
        payments,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      }))
  );
}
