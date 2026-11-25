import fc from 'fast-check';
import { AVATAR_COLOR_COUNT } from '../avatar';
import { CURRENCY_CODES, type CurrencyCode } from '../currency';
import { MAX_AMOUNT } from '../money';
import type { Expense, Group, Member, Payment, Split } from '../types';

const BASE_TIME = '2026-01-01T12:00:00.000Z';

/** Amounts mixing small values (lots of remainders) and the whole valid range. */
export const amountArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: 1, max: 50 }),
  fc.integer({ min: 1, max: 100_000 }),
  fc.integer({ min: 1, max: MAX_AMOUNT })
);

export const currencyArb: fc.Arbitrary<CurrencyCode> = fc.constantFrom(
  ...CURRENCY_CODES
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

/** `count` whole numbers >= 1 that add up to exactly `total` (needs `total >= count`). */
function compositionArb(total: number, count: number): fc.Arbitrary<number[]> {
  if (count === 1) return fc.constant([total]);
  return fc
    .uniqueArray(fc.integer({ min: 1, max: total - 1 }), {
      minLength: count - 1,
      maxLength: count - 1,
    })
    .map((cuts) => {
      const points = [0, ...cuts.sort((a, b) => a - b), total];
      return points.slice(1).map((point, i) => point - points[i]);
    });
}

/**
 * A valid split of `amount` among (a subset of) `ids`, of any of the four
 * kinds: exact amounts that add up, percentages in basis points that add up
 * to 10000 (each at least 1) and parts of at least 1. `kinds` restricts them.
 */
export function splitArb(
  amount: number,
  ids: string[],
  kinds: Split['type'][] = ['equal', 'exact', 'percent', 'shares']
): fc.Arbitrary<Split> {
  const participants = (limit: number) =>
    fc.uniqueArray(fc.constantFrom(...ids), {
      minLength: 1,
      maxLength: Math.max(1, Math.min(ids.length, limit)),
    });
  const withValues = (
    total: number,
    build: (participantIds: string[], byId: Record<string, number>) => Split
  ) =>
    participants(total).chain((participantIds) =>
      compositionArb(total, participantIds.length).map((values) =>
        build(
          participantIds,
          Object.fromEntries(participantIds.map((id, i) => [id, values[i]]))
        )
      )
    );
  const byKind: Record<Split['type'], fc.Arbitrary<Split>> = {
    equal: participants(ids.length).map((participantIds) => ({
      type: 'equal',
      participantIds,
    })),
    exact: withValues(amount, (participantIds, amounts) => ({
      type: 'exact',
      participantIds,
      amounts,
    })),
    percent: withValues(10_000, (participantIds, basisPoints) => ({
      type: 'percent',
      participantIds,
      basisPoints,
    })),
    shares: participants(ids.length).chain((participantIds) =>
      fc
        .array(fc.integer({ min: 1, max: 20 }), {
          minLength: participantIds.length,
          maxLength: participantIds.length,
        })
        .map((values) => ({
          type: 'shares' as const,
          participantIds,
          parts: Object.fromEntries(
            participantIds.map((id, i) => [id, values[i]])
          ),
        }))
    ),
  };
  return fc.oneof(...kinds.map((kind) => byKind[kind]));
}

function expenseArb(
  members: Member[],
  index: number,
  splits: Split['type'][]
): fc.Arbitrary<Expense> {
  const ids = members.map((m) => m.id);
  return fc
    .record({
      amount: amountArb,
      payerId: fc.constantFrom(...ids),
      date: dateArb,
    })
    .chain((base) =>
      splitArb(base.amount, ids, splits).map((split): Expense => ({
        id: `e${index}`,
        description: `Gasto ${index}`,
        amount: base.amount,
        payerId: base.payerId,
        split,
        date: base.date,
        createdAt: BASE_TIME,
      }))
    );
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
    /** Kinds of split the expenses may have (equal only by default). */
    splits?: Split['type'][];
    /** Fixed currency; by default any of the supported ones (0 and 2 decimals). */
    currency?: CurrencyCode;
  } = {}
): fc.Arbitrary<Group> {
  const {
    minMembers = 1,
    maxMembers = 8,
    maxExpenses = 10,
    maxPayments = 5,
    splits = ['equal'],
    currency,
  } = options;
  return membersArb(minMembers, maxMembers).chain((members) =>
    fc
      .record({
        expenses: fc
          .integer({ min: 0, max: maxExpenses })
          .chain((n) =>
            fc.tuple(
              ...Array.from({ length: n }, (_, i) =>
                expenseArb(members, i, splits)
              )
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
      .chain((parts) =>
        (currency ? fc.constant(currency) : currencyArb).map((code) => ({
          ...parts,
          currency: code,
        }))
      )
      .map(({ expenses, payments, currency: code }) => ({
        id: 'g1',
        name: 'Grupo',
        currency: code,
        members,
        expenses,
        payments,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      }))
  );
}
