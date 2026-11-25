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

/**
 * How a balance changes, in words: "le deben $20.000 → $15.000" when the side
 * stays the same, or both in full ("le deben $5.000 → debe $2.000", "debe
 * $3.000 → al día") when it flips or settles.
 */
export function describeBalanceChange(
  before: number,
  after: number,
  currency: CurrencyCode
): string {
  const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  if (before !== 0 && Math.sign(before) === Math.sign(after)) {
    const amount = formatAmount(Math.abs(after), currency);
    return `${lower(describeBalance(before, currency))} → ${amount}`;
  }
  return `${lower(describeBalance(before, currency))} → ${lower(describeBalance(after, currency))}`;
}
