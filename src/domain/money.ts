import type { Amount } from './types';

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 999_999_999;

export function isValidAmount(value: unknown): value is Amount {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= MIN_AMOUNT &&
    value <= MAX_AMOUNT
  );
}

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
});

/** Formats an amount as CLP, e.g. `$10.000`. Accepts 0 and negatives (balances). */
export function formatAmount(amount: Amount): string {
  return clpFormatter.format(amount);
}
