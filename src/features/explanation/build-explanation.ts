import {
  computeBalances,
  computeShares,
  suggestTransfers,
  type Amount,
  type ExpenseId,
  type Group,
  type Member,
  type MemberId,
  type Payment,
  type SuggestedTransfer,
} from '@/domain';
import { suggestIcon, type IconKey } from '@/features/icons';
import {
  MAX_COLORED_EXPENSES,
  colorForRank,
  type ColorMap,
  type ExpenseColor,
} from './colors';

export interface ExplainedExpense {
  id: ExpenseId;
  description: string;
  amount: Amount;
  payerId: MemberId;
  participantIds: MemberId[];
  /** 0 = the biggest expense. */
  rank: number;
  color: ExpenseColor;
  icon: IconKey;
  /**
   * What each participant owes for this expense (`computeShares`), in group
   * order, leaving out those who owe nothing. Adds up to `amount`.
   */
  shares: { memberId: MemberId; amount: Amount }[];
}

/** The part of a bar that belongs to one expense. */
export interface Slice {
  expenseId: ExpenseId;
  amount: Amount;
}

export interface MemberExplanation {
  member: Member;
  paid: Amount;
  share: Amount;
  paymentsSent: Amount;
  paymentsReceived: Amount;
  /** `paid - share + paymentsSent - paymentsReceived`, straight from the domain. */
  balance: Amount;
  /** What the member paid, split by expense (biggest expense first). */
  paidSlices: Slice[];
  /** The member's share, split by expense (biggest expense first). */
  shareSlices: Slice[];
}

export interface Explanation {
  /** Sorted by amount descending, then by `createdAt` (decision 92). */
  expenses: ExplainedExpense[];
  members: MemberExplanation[];
  transfers: SuggestedTransfer[];
  payments: Payment[];
  colors: ColorMap;
  totalSpent: Amount;
  /** The tallest bar (paid or share) of any member: the common scale. */
  scaleMax: Amount;
}

/**
 * Everything the "Pagó vs. su parte" chart and the step-by-step animation
 * draw, derived from the real domain (`computeShares`, `computeBalances`,
 * `suggestTransfers`). Pure: no React, no storage.
 */
export function buildExplanation(group: Group): Explanation {
  const sorted = [...group.expenses].sort(
    (a, b) =>
      b.amount - a.amount ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
  );
  const expenses: ExplainedExpense[] = sorted.map((expense, rank) => ({
    shares: [...computeShares(expense, group.members)]
      .filter(([, amount]) => amount > 0)
      .map(([memberId, amount]) => ({ memberId, amount })),
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    payerId: expense.payerId,
    participantIds: expense.split.participantIds,
    rank,
    color: colorForRank(rank),
    icon: suggestIcon(expense.description, 'expense'),
  }));
  const colors: ColorMap = new Map(expenses.map((e) => [e.id, e.color]));

  const shareSlicesOf = new Map<MemberId, Slice[]>(
    group.members.map((m) => [m.id, []])
  );
  const paidSlicesOf = new Map<MemberId, Slice[]>(
    group.members.map((m) => [m.id, []])
  );
  for (const expense of sorted) {
    paidSlicesOf
      .get(expense.payerId)
      ?.push({ expenseId: expense.id, amount: expense.amount });
    for (const [memberId, amount] of computeShares(expense, group.members)) {
      if (amount > 0) {
        shareSlicesOf.get(memberId)?.push({ expenseId: expense.id, amount });
      }
    }
  }

  const balances = new Map(computeBalances(group).map((b) => [b.memberId, b]));
  const members: MemberExplanation[] = group.members.map((member) => {
    const b = balances.get(member.id);
    return {
      member,
      paid: b?.paid ?? 0,
      share: b?.share ?? 0,
      paymentsSent: b?.paymentsSent ?? 0,
      paymentsReceived: b?.paymentsReceived ?? 0,
      balance: b?.balance ?? 0,
      paidSlices: paidSlicesOf.get(member.id) ?? [],
      shareSlices: shareSlicesOf.get(member.id) ?? [],
    };
  });

  return {
    expenses,
    members,
    transfers: suggestTransfers(group),
    payments: group.payments,
    colors,
    totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
    scaleMax: Math.max(0, ...members.flatMap((m) => [m.paid, m.share])),
  };
}

export interface LegendEntry {
  /** An expense id, or `'others'` for the grey row that groups the rest. */
  key: string;
  label: string;
  total: Amount;
  color: ExpenseColor;
  /** The expense whose icon is shown; `null` for the grouped row. */
  expense: ExplainedExpense | null;
}

/**
 * One legend row per colored expense (up to 12) and, if there are more, a
 * single grey "Otros" row that adds up the rest.
 */
export function buildLegend(explanation: Explanation): LegendEntry[] {
  const { expenses } = explanation;
  const entries: LegendEntry[] = expenses
    .slice(0, MAX_COLORED_EXPENSES)
    .map((expense) => ({
      key: expense.id,
      label: expense.description,
      total: expense.amount,
      color: expense.color,
      expense,
    }));
  const rest = expenses.slice(MAX_COLORED_EXPENSES);
  if (rest.length > 0) {
    entries.push({
      key: 'others',
      label: `Otros (${rest.length} gastos)`,
      total: rest.reduce((sum, e) => sum + e.amount, 0),
      color: { kind: 'other' },
      expense: null,
    });
  }
  return entries;
}
