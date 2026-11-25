import { formatAmount, type CurrencyCode } from '@/domain';
import type { ExplainedExpense } from './build-explanation';

/** A part narrower than this (in px) is too thin to tell from its neighbors. */
export const MIN_PART_PX = 6;

/**
 * Where to cut the segment of an expense in "Gastó": one cut between each
 * pair of parts, as a fraction (0 to 1) of the segment's width, from its left
 * edge. The parts are the real shares (`computeShares`), so the extra unit of
 * the remainder widens the first parts and moves the cuts accordingly.
 *
 * If the narrowest part would measure less than `MIN_PART_PX`, there are no
 * cuts at all (a segment is either cut in every part or not cut). With a
 * single part there is nothing to cut. Pure.
 */
export function computeCuts(
  expense: Pick<ExplainedExpense, 'amount' | 'shares'>,
  segmentPx: number
): number[] {
  const parts = expense.shares.map((share) => share.amount);
  if (parts.length < 2 || expense.amount <= 0) return [];
  if ((Math.min(...parts) / expense.amount) * segmentPx < MIN_PART_PX) {
    return [];
  }
  const cuts: number[] = [];
  let sum = 0;
  for (const part of parts.slice(0, -1)) {
    sum += part;
    cuts.push(sum / expense.amount);
  }
  return cuts;
}

/** Above this many parts the tooltip groups equal parts instead of listing each. */
const MAX_LISTED_PARTS = 6;

/**
 * The division of an expense for the tooltip, e.g. "entre 5: $30.000 c/u" or,
 * with a remainder, "entre 3: $3.334 / $3.333 / $3.333". A custom split says
 * how it was made: "por partes: Ana 2, Beto 1, Carla 1" (or "por montos: Ana
 * $50.000, …", "por porcentaje: Ana 50 %, …"). `null` when only one person
 * pays it (there is no division to show).
 */
export function describeDivision(
  expense: Pick<ExplainedExpense, 'shares' | 'participantIds'> &
    Partial<Pick<ExplainedExpense, 'customDivision'>>,
  currency: CurrencyCode
): string | null {
  const people = expense.participantIds.length;
  if (people < 2) return null;
  if (expense.customDivision) return expense.customDivision;
  // Participants who owe nothing (more people than units) are not in `shares`.
  const parts = [
    ...expense.shares.map((share) => share.amount),
    ...new Array<number>(Math.max(0, people - expense.shares.length)).fill(0),
  ];
  const distinct = [...new Set(parts)];
  if (distinct.length === 1) {
    return `entre ${people}: ${formatAmount(parts[0], currency)} c/u`;
  }
  if (parts.length <= MAX_LISTED_PARTS) {
    return `entre ${people}: ${parts.map((p) => formatAmount(p, currency)).join(' / ')}`;
  }
  const groups = distinct.map(
    (amount) =>
      `${formatAmount(amount, currency)} (${parts.filter((p) => p === amount).length})`
  );
  return `entre ${people}: ${groups.join(' / ')}`;
}
