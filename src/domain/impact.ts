import { computeBalances } from './balances';
import type { Amount, ExpenseId, Group, MemberId } from './types';

/** A member whose balance differs between two versions of a group. */
export interface BalanceChange {
  memberId: MemberId;
  before: Amount;
  after: Amount;
}

/**
 * A "covered expense" (gasto ya saldado) is one that existed when a payment
 * was registered: the group has at least one payment created after the
 * expense. Simple and explainable on purpose; it errs on the side of warning
 * too often rather than too rarely. `false` if the expense does not exist.
 */
export function isExpenseCoveredByPayments(
  group: Group,
  expenseId: ExpenseId
): boolean {
  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense) return false;
  const created = Date.parse(expense.createdAt);
  return group.payments.some((p) => Date.parse(p.createdAt) > created);
}

/**
 * Members whose balance changes from `group` to `nextGroup`, in the order of
 * `group`. Members that do not exist in `nextGroup` are skipped (the preview
 * is meant for edits that keep the same members).
 */
export function previewBalanceChange(
  group: Group,
  nextGroup: Group
): BalanceChange[] {
  const after = new Map(
    computeBalances(nextGroup).map((b) => [b.memberId, b.balance])
  );
  const changes: BalanceChange[] = [];
  for (const { memberId, balance } of computeBalances(group)) {
    const next = after.get(memberId);
    if (next !== undefined && next !== balance) {
      changes.push({ memberId, before: balance, after: next });
    }
  }
  return changes;
}
