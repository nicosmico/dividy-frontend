import { describeBalance } from '@/lib/balance-text';
import { cn } from '@/lib/utils';

/** Balance as text and color (never color alone). */
export function BalanceLabel({
  balance,
  className,
}: {
  balance: number;
  className?: string;
}) {
  const tone =
    balance > 0
      ? 'font-semibold text-positive'
      : balance < 0
        ? 'font-semibold text-negative'
        : 'font-medium text-muted-foreground';
  return (
    <span className={cn(tone, className)}>{describeBalance(balance)}</span>
  );
}
