import { formatAmount } from './money';
import { fail, ok } from './result';
import type {
  Amount,
  EqualSplit,
  Expense,
  Member,
  MemberId,
  Result,
  Split,
  SplitType,
} from './types';

/** 100,00 % in basis points (ADR 0008). */
export const FULL_PERCENT = 10_000;

/**
 * Splits `total` pesos in proportion to `weights` (non-negative integers):
 * each part is the floor of its exact proportional part and the pesos left
 * over go $1 at a time to the first entries, in the order given. With equal
 * weights this is the classic "equal split with remainder". Integer math
 * (BigInt), so it is exact for any safe integers.
 *
 * Private on purpose: `computeShares` is the only door to money division
 * (ADR 0001); `presetSplit` below goes through it too.
 */
function distribute(total: Amount, weights: readonly number[]): Amount[] {
  const sum = weights.reduce((s, w) => s + BigInt(w), 0n);
  if (sum === 0n) return weights.map(() => 0);
  const exact = weights.map((w) => BigInt(total) * BigInt(w));
  const base = exact.map((e) => e / sum);
  // The leftover pesos go to the first entries that had a fractional part:
  // an entry whose proportion was exact never gets one, so every part stays
  // within $1 of its exact proportion. With equal weights the entries that
  // have a fraction are all of them, so this is the plain "first ones".
  let remainder = Number(BigInt(total) - base.reduce((s, b) => s + b, 0n));
  return base.map((b, index) => {
    const hasFraction = exact[index] % sum !== 0n;
    if (hasFraction && remainder > 0) {
      remainder--;
      return Number(b) + 1;
    }
    return Number(b);
  });
}

/** The number each participant carries in a custom split (`undefined` for `equal`). */
export function splitValuesOf(
  split: Split
): Record<MemberId, number> | undefined {
  switch (split.type) {
    case 'exact':
      return split.amounts;
    case 'percent':
      return split.basisPoints;
    case 'shares':
      return split.parts;
    case 'equal':
      return undefined;
  }
}

/**
 * What each participant owes for an expense. The remainder goes $1 at a time
 * to the first participants following the order of `members` (not the order
 * of `participantIds`):
 *
 * - `equal`: `amount / n`, remainder to the first.
 * - `percent` and `shares`: the floor of the proportional part, remainder to
 *   the first, so every part is within $1 of the exact proportion.
 * - `exact`: the amounts as they are (validation guarantees they add up).
 *
 * This is the only function in the code base that divides money (ADR 0001).
 * Participants that are not in `members` are ignored.
 */
export function computeShares(
  expense: Pick<Expense, 'amount' | 'split'>,
  members: readonly Member[]
): Map<MemberId, Amount> {
  const { split } = expense;
  const participantIds = new Set(split.participantIds);
  const participants = members.filter((m) => participantIds.has(m.id));
  const shares = new Map<MemberId, Amount>();
  if (participants.length === 0) return shares;

  if (split.type === 'exact') {
    for (const member of participants) {
      shares.set(member.id, split.amounts[member.id] ?? 0);
    }
    return shares;
  }
  const values = splitValuesOf(split);
  const weights = participants.map((m) => (values ? (values[m.id] ?? 0) : 1));
  const parts = distribute(expense.amount, weights);
  participants.forEach((member, index) => shares.set(member.id, parts[index]));
  return shares;
}

/** `5000` → `"50 %"`, `1250` → `"12,5 %"`. */
export function formatPercent(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })} %`;
}

/** The label of a custom split: "por montos", "por porcentaje" or "por partes". */
export function splitTypeLabel(type: Exclude<SplitType, 'equal'>): string {
  return type === 'exact'
    ? 'por montos'
    : type === 'percent'
      ? 'por porcentaje'
      : 'por partes';
}

/**
 * "Ana 2, Beto 1" / "Ana $50.000, Beto $40.000" / "Ana 50 %, Beto 50 %": the
 * value of each participant, in group order. `null` for an equal split.
 */
export function describeSplitValues(
  split: Split,
  members: readonly Pick<Member, 'id' | 'name'>[]
): string | null {
  const values = splitValuesOf(split);
  if (!values) return null;
  const format = (value: number) =>
    split.type === 'exact'
      ? formatAmount(value)
      : split.type === 'percent'
        ? formatPercent(value)
        : String(value);
  const ids = new Set(split.participantIds);
  return members
    .filter((m) => ids.has(m.id))
    .map((m) => `${m.name} ${format(values[m.id] ?? 0)}`)
    .join(', ');
}

function isWhole(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * Checks that a split can be applied to an expense of `amount` pesos and
 * returns it normalized (only the participants' values, copied). Each error
 * says what to do. `participantIds` is assumed to be valid already (no
 * duplicates, all members of the group).
 */
export function validateSplit(
  amount: Amount,
  split: Split,
  members: readonly Pick<Member, 'id' | 'name'>[]
): Result<Split> {
  const participantIds = [...split.participantIds];
  if (split.type === 'equal') return ok({ type: 'equal', participantIds });

  const nameOf = (id: MemberId) =>
    members.find((m) => m.id === id)?.name ?? 'alguien';
  const values = splitValuesOf(split)!;
  const kept: Record<MemberId, number> = {};
  for (const id of participantIds) {
    const value = values[id];
    if (!isWhole(value) || value < 0) {
      return fail(
        'invalid_split',
        split.type === 'shares'
          ? 'Cada parte debe ser al menos 1.'
          : `Revisa el valor de ${nameOf(id)}: debe ser un número entero.`
      );
    }
    if (value === 0 && split.type === 'exact') {
      return fail(
        'invalid_split',
        `Quita de la división a ${nameOf(id)}, que tiene $0, o asígnale un monto.`
      );
    }
    if (value === 0 && split.type === 'percent') {
      return fail(
        'invalid_split',
        `Quita de la división a ${nameOf(id)}, que tiene 0 %, o asígnale un porcentaje.`
      );
    }
    if (value < 1) {
      return fail('invalid_split', 'Cada parte debe ser al menos 1.');
    }
    kept[id] = value;
  }
  const sum = participantIds.reduce((s, id) => s + kept[id], 0);

  if (split.type === 'exact') {
    if (sum < amount) {
      return fail(
        'invalid_split',
        `Faltan ${formatAmount(amount - sum)} por asignar.`
      );
    }
    if (sum > amount) {
      return fail(
        'invalid_split',
        `Te pasaste por ${formatAmount(sum - amount)}.`
      );
    }
    return ok({ type: 'exact', participantIds, amounts: kept });
  }
  if (split.type === 'percent') {
    if (sum !== FULL_PERCENT) {
      return fail(
        'invalid_split',
        `Los porcentajes suman ${formatPercent(sum)}; deben sumar 100 %.`
      );
    }
    return ok({ type: 'percent', participantIds, basisPoints: kept });
  }
  return ok({ type: 'shares', participantIds, parts: kept });
}

/**
 * A split of the given type that already adds up, to start editing from:
 * `exact` is today's equal split in pesos; `percent` is an equal split of
 * 100,00 % (the leftover hundredths go to the first); `shares` is one part
 * each. Participants are taken in group order. Goes through `computeShares`,
 * so there is no second division algorithm.
 */
export function presetSplit(
  type: SplitType,
  amount: Amount,
  participantIds: readonly MemberId[],
  members: readonly Member[]
): Split {
  const chosen = new Set(participantIds);
  const ids = members.filter((m) => chosen.has(m.id)).map((m) => m.id);
  const equal: EqualSplit = { type: 'equal', participantIds: ids };
  const through = (total: Amount) =>
    Object.fromEntries(computeShares({ amount: total, split: equal }, members));
  switch (type) {
    case 'equal':
      return equal;
    case 'exact':
      return { type: 'exact', participantIds: ids, amounts: through(amount) };
    case 'percent':
      return {
        type: 'percent',
        participantIds: ids,
        basisPoints: through(FULL_PERCENT),
      };
    case 'shares':
      return {
        type: 'shares',
        participantIds: ids,
        parts: Object.fromEntries(ids.map((id) => [id, 1])),
      };
  }
}

/** The same participants (minus `without`) in equal parts: what a custom split becomes when someone is removed in a cascade delete. */
export function toEqualSplit(split: Split, without?: MemberId): EqualSplit {
  return {
    type: 'equal',
    participantIds: split.participantIds.filter((id) => id !== without),
  };
}

/**
 * Hands `from`'s place in the split to `to` (reassigning a member). `to`
 * takes `from`'s value (amount, percentage or parts), added to their own if
 * they already took part.
 */
export function reassignSplit(
  split: Split,
  from: MemberId,
  to: MemberId
): Split {
  const participantIds = [
    ...new Set(split.participantIds.map((id) => (id === from ? to : id))),
  ];
  const values = splitValuesOf(split);
  if (!values) return { type: 'equal', participantIds };
  const moved: Record<MemberId, number> = {};
  for (const id of split.participantIds) {
    const target = id === from ? to : id;
    moved[target] = (moved[target] ?? 0) + values[id];
  }
  switch (split.type) {
    case 'exact':
      return { type: 'exact', participantIds, amounts: moved };
    case 'percent':
      return { type: 'percent', participantIds, basisPoints: moved };
    default:
      return { type: 'shares', participantIds, parts: moved };
  }
}
