import type { Amount, Expense, Member, MemberId } from './types';

/**
 * Splits an expense equally among its participants. The remainder
 * (`amount % n`) goes $1 at a time to the first participants following the
 * order of `members` (not the order of `participantIds`).
 *
 * This is the only function in the code base that divides money (ADR 0001).
 * Participants that are not in `members` are ignored.
 */
export function computeShares(
  expense: Expense,
  members: readonly Member[]
): Map<MemberId, Amount> {
  const participantIds = new Set(expense.split.participantIds);
  const participants = members.filter((m) => participantIds.has(m.id));
  const shares = new Map<MemberId, Amount>();
  const n = participants.length;
  if (n === 0) return shares;

  const base = Math.floor(expense.amount / n);
  const remainder = expense.amount - base * n;
  participants.forEach((member, index) => {
    shares.set(member.id, base + (index < remainder ? 1 : 0));
  });
  return shares;
}
