import { formatAmount, type CurrencyCode } from '@/domain';

/** A balance in words: "Al día", "Debe $X" or "Le deben $X". */
export function describeBalance(
  balance: number,
  currency: CurrencyCode
): string {
  if (balance > 0) return `Le deben ${formatAmount(balance, currency)}`;
  if (balance < 0) return `Debe ${formatAmount(-balance, currency)}`;
  return 'Al día';
}
