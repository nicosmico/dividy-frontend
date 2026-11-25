import { computeShares } from './split';
import type { Amount, Expense, Group, MemberId } from './types';

/**
 * The quick filter of the expense list (CONTEXT.md, Filter). One at a time:
 *
 * - `mine`: expenses where the viewer participates ("Donde participo").
 * - `paid`: expenses the viewer paid ("Pagué yo").
 * - `member`: expenses where `memberId` participates.
 * - `paidby`: expenses `memberId` paid.
 *
 * `mine` and `paid` need to know who the viewer is.
 */
export type ExpenseFilter =
  | { kind: 'mine' }
  | { kind: 'paid' }
  | { kind: 'member'; memberId: MemberId }
  | { kind: 'paidby'; memberId: MemberId };

/** The search box only shows up for groups with at least this many expenses. */
export const SEARCH_MIN_EXPENSES = 11;

/** `true` when `mine` / `paid` are used, which are meaningless without a viewer. */
export function filterNeedsViewer(filter: ExpenseFilter | null): boolean {
  return filter?.kind === 'mine' || filter?.kind === 'paid';
}

/** Lowercase and without accents: `"Cabaña"` -> `"cabana"`. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es-CL')
    .normalize('NFC');
}

/** The words of a search, normalized (`""` and blanks give no words). */
export function searchWords(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/u).filter(Boolean);
}

function matchesFilter(
  expense: Expense,
  filter: ExpenseFilter,
  viewerId: MemberId | null
): boolean {
  switch (filter.kind) {
    case 'mine':
      return (
        viewerId !== null && expense.split.participantIds.includes(viewerId)
      );
    case 'paid':
      return viewerId !== null && expense.payerId === viewerId;
    case 'member':
      return expense.split.participantIds.includes(filter.memberId);
    case 'paidby':
      return expense.payerId === filter.memberId;
  }
}

/**
 * The expenses of `group` that pass the filter and the search, in the same
 * order. `query` is matched against the description, ignoring case and
 * accents; every word must appear. Filter and search combine with "and".
 * `mine` / `paid` without a `viewerId` match nothing.
 */
export function filterExpenses(
  group: Pick<Group, 'expenses'>,
  filter: ExpenseFilter | null,
  query: string,
  viewerId: MemberId | null
): Expense[] {
  const words = searchWords(query);
  return group.expenses.filter((expense) => {
    if (filter && !matchesFilter(expense, filter, viewerId)) return false;
    if (words.length === 0) return true;
    const description = normalizeSearchText(expense.description);
    return words.every((word) => description.includes(word));
  });
}

/**
 * What `memberId` owes in `expense`, or `null` when they do not participate.
 * Comes from `computeShares`, so it is the same number as in Saldos.
 */
export function expenseShareOf(
  group: Pick<Group, 'members'>,
  expense: Expense,
  memberId: MemberId
): Amount | null {
  if (!expense.split.participantIds.includes(memberId)) return null;
  return computeShares(expense, group.members).get(memberId) ?? 0;
}

export interface ExpensesSummary {
  count: number;
  /** Sum of the full amount of each expense. */
  total: Amount;
  /** What the viewer owes in these expenses (`null` when nobody is the viewer). */
  viewerShare: Amount | null;
  /** What `memberId` owes in these expenses (`null` when none was given). */
  memberShare: Amount | null;
}

function sumShares(
  group: Pick<Group, 'members'>,
  expenses: readonly Expense[],
  memberId: MemberId
): Amount {
  return expenses.reduce(
    (sum, expense) => sum + (expenseShareOf(group, expense, memberId) ?? 0),
    0
  );
}

/** Count, total and the shares of the viewer (and of one more member) of a list of expenses. */
export function summarizeExpenses(
  group: Pick<Group, 'members'>,
  expenses: readonly Expense[],
  viewerId: MemberId | null,
  memberId: MemberId | null = null
): ExpensesSummary {
  return {
    count: expenses.length,
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    viewerShare:
      viewerId === null ? null : sumShares(group, expenses, viewerId),
    memberShare:
      memberId === null ? null : sumShares(group, expenses, memberId),
  };
}

/** The value of the `f` query param: `mine`, `paid`, `member:<id>` or `paidby:<id>`. */
export function serializeExpenseFilter(filter: ExpenseFilter): string {
  return filter.kind === 'mine' || filter.kind === 'paid'
    ? filter.kind
    : `${filter.kind}:${filter.memberId}`;
}

/**
 * Reads the `f` query param. Anything that is not a valid value, or that names
 * a member who is not in the group, gives `null` (it is ignored).
 */
export function parseExpenseFilter(
  raw: string | null | undefined,
  group: Pick<Group, 'members'>
): ExpenseFilter | null {
  if (!raw) return null;
  if (raw === 'mine') return { kind: 'mine' };
  if (raw === 'paid') return { kind: 'paid' };
  const colon = raw.indexOf(':');
  if (colon < 0) return null;
  const kind = raw.slice(0, colon);
  const memberId = raw.slice(colon + 1);
  if (kind !== 'member' && kind !== 'paidby') return null;
  if (!group.members.some((m) => m.id === memberId)) return null;
  return { kind, memberId };
}
