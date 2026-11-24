import type { ExpenseId } from '@/domain';
import type { Explanation } from './build-explanation';

/** Expenses walked one by one in step 2; the rest are split together. */
export const MAX_INDIVIDUAL_SHARE_STEPS = 6;

/**
 * One sub-step of "Se calcula su parte": the expense (or, for the last
 * sub-step of a big group, the group of expenses) that is split now.
 */
export interface ShareStep {
  kind: 'expense' | 'rest';
  /** What is split in this sub-step: one expense, or all the remaining ones. */
  expenseIds: ExpenseId[];
  /** Everything split up to and including this sub-step. */
  revealedIds: ExpenseId[];
}

/**
 * The sub-steps of step 2, biggest expense first. Up to 6 expenses go one by
 * one; with more, the 6 biggest do and the others share a last sub-step.
 * Without expenses there are none. Pure.
 */
export function buildShareSteps(explanation: Explanation): ShareStep[] {
  const ids = explanation.expenses.map((e) => e.id);
  const steps: ShareStep[] = [];
  const revealed: ExpenseId[] = [];
  for (const id of ids.slice(0, MAX_INDIVIDUAL_SHARE_STEPS)) {
    revealed.push(id);
    steps.push({
      kind: 'expense',
      expenseIds: [id],
      revealedIds: [...revealed],
    });
  }
  const rest = ids.slice(MAX_INDIVIDUAL_SHARE_STEPS);
  if (rest.length > 0) {
    steps.push({ kind: 'rest', expenseIds: rest, revealedIds: ids });
  }
  return steps;
}
