import { formatAmount } from '@/domain';

/** A balance in words: "Al día", "Debe $X" or "Le deben $X". */
export function describeBalance(balance: number): string {
  if (balance > 0) return `Le deben ${formatAmount(balance)}`;
  if (balance < 0) return `Debe ${formatAmount(-balance)}`;
  return 'Al día';
}
