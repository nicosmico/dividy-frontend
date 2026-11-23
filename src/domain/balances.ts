import { computeShares } from './split';
import type { Amount, ExpenseId, Group, MemberId, Payment } from './types';

export interface MemberBalance {
  memberId: MemberId;
  /** Total the member paid for expenses. */
  paid: Amount;
  /** Total the member owes for the expenses they participate in. */
  share: Amount;
  paymentsSent: Amount;
  paymentsReceived: Amount;
  /** `paid - share + paymentsSent - paymentsReceived`. Positive: they are owed. */
  balance: Amount;
}

export interface ExpenseLine {
  expenseId: ExpenseId;
  description: string;
  date: string;
  paid: Amount;
  share: Amount;
}

export interface MemberBreakdown {
  balance: MemberBalance;
  /** Only expenses where the member paid or participates, in group order. */
  expenses: ExpenseLine[];
  paymentsSent: Payment[];
  paymentsReceived: Payment[];
}

/** Balances in member order. Derived data: never persisted. */
export function computeBalances(group: Group): MemberBalance[] {
  const byId = new Map<MemberId, MemberBalance>();
  const result = group.members.map((m): MemberBalance => {
    const entry = {
      memberId: m.id,
      paid: 0,
      share: 0,
      paymentsSent: 0,
      paymentsReceived: 0,
      balance: 0,
    };
    byId.set(m.id, entry);
    return entry;
  });

  for (const expense of group.expenses) {
    const payer = byId.get(expense.payerId);
    if (payer) payer.paid += expense.amount;
    for (const [memberId, share] of computeShares(expense, group.members)) {
      byId.get(memberId)!.share += share;
    }
  }
  for (const payment of group.payments) {
    const from = byId.get(payment.fromId);
    if (from) from.paymentsSent += payment.amount;
    const to = byId.get(payment.toId);
    if (to) to.paymentsReceived += payment.amount;
  }
  for (const entry of result) {
    entry.balance =
      entry.paid - entry.share + entry.paymentsSent - entry.paymentsReceived;
  }
  return result;
}

/** Explains a member's balance ("why?" screen). `null` if the member does not exist. */
export function getMemberBreakdown(
  group: Group,
  memberId: MemberId
): MemberBreakdown | null {
  const balance = computeBalances(group).find((b) => b.memberId === memberId);
  if (!balance) return null;

  const expenses: ExpenseLine[] = [];
  for (const expense of group.expenses) {
    const paid = expense.payerId === memberId ? expense.amount : 0;
    const share = computeShares(expense, group.members).get(memberId) ?? 0;
    const participates = expense.split.participantIds.includes(memberId);
    if (paid > 0 || participates) {
      expenses.push({
        expenseId: expense.id,
        description: expense.description,
        date: expense.date,
        paid,
        share,
      });
    }
  }
  return {
    balance,
    expenses,
    paymentsSent: group.payments.filter((p) => p.fromId === memberId),
    paymentsReceived: group.payments.filter((p) => p.toId === memberId),
  };
}

export function isSettled(group: Group): boolean {
  return computeBalances(group).every((b) => b.balance === 0);
}
