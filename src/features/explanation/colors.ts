import type { CSSProperties } from 'react';

import type { ExpenseId } from '@/domain';

/** The six validated categorical colors (`--chart-1` .. `--chart-6`). */
export type ChartSlot = 1 | 2 | 3 | 4 | 5 | 6;

/** How an expense is painted in the charts (decision 92). */
export type ExpenseColor =
  | { kind: 'solid'; slot: ChartSlot }
  | { kind: 'striped'; slot: ChartSlot }
  | { kind: 'other' };

const SLOTS = 6;
/** Expenses 1 to 6 are solid, 7 to 12 striped, 13 onwards are "Otros". */
export const MAX_COLORED_EXPENSES = SLOTS * 2;

/** Color of the expense at `rank` (0 = the biggest). Total: never throws. */
export function colorForRank(rank: number): ExpenseColor {
  if (rank < SLOTS) return { kind: 'solid', slot: (rank + 1) as ChartSlot };
  if (rank < MAX_COLORED_EXPENSES) {
    return { kind: 'striped', slot: (rank - SLOTS + 1) as ChartSlot };
  }
  return { kind: 'other' };
}

function baseVar(color: ExpenseColor): string {
  return color.kind === 'other'
    ? 'var(--chart-other)'
    : `var(--chart-${color.slot})`;
}

/**
 * Inline style that paints a swatch or a bar segment. Stripes alternate the
 * color with the card surface, so they work in light and dark.
 */
export function fillStyle(color: ExpenseColor): CSSProperties {
  const base = baseVar(color);
  if (color.kind === 'striped') {
    return {
      backgroundColor: base,
      backgroundImage: `repeating-linear-gradient(45deg, transparent 0 3px, var(--card) 3px 5px)`,
    };
  }
  return { backgroundColor: base };
}

/** Color of each expense id, for painting slices. */
export type ColorMap = ReadonlyMap<ExpenseId, ExpenseColor>;
