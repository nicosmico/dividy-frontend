import { Input } from '@/components/ui/input';
import { currencyInfo, currencySymbol, type CurrencyCode } from '@/domain';
import type { CustomSplitType } from './expense-form';
import { normalizeSplitText, sanitizeSplitInput } from './expense-form';
import { cn } from '@/lib/utils';

const NAME_PREFIX: Record<CustomSplitType, string> = {
  exact: 'Monto',
  percent: 'Porcentaje',
  shares: 'Partes',
};

interface SplitValueInputProps {
  type: CustomSplitType;
  currency: CurrencyCode;
  /** Name of the participant, for the accessible name ("Monto de Ana"). */
  memberName: string;
  value: string;
  onValueChange: (text: string) => void;
  invalid?: boolean;
}

/**
 * The small field next to each participant in a custom split. Accepts the
 * Chilean way of writing numbers ("10.000", "12,5") and shows the value
 * formatted when you leave it.
 */
export function SplitValueInput({
  type,
  currency,
  memberName,
  value,
  onValueChange,
  invalid,
}: SplitValueInputProps) {
  const symbol = currencySymbol(currency);
  const { decimals } = currencyInfo(currency);
  const adornment = type === 'exact' ? symbol : type === 'percent' ? '%' : null;
  return (
    <div
      className={cn(
        'relative shrink-0',
        type === 'exact' ? (symbol.length > 2 ? 'w-32' : 'w-28') : 'w-20'
      )}
    >
      {type === 'exact' && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground'
        >
          {adornment}
        </span>
      )}
      <Input
        type='text'
        inputMode={
          type === 'percent' || (type === 'exact' && decimals > 0)
            ? 'decimal'
            : 'numeric'
        }
        autoComplete='off'
        placeholder='0'
        aria-label={`${NAME_PREFIX[type]} de ${memberName}`}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) =>
          onValueChange(sanitizeSplitInput(type, event.target.value, currency))
        }
        onBlur={() => onValueChange(normalizeSplitText(type, value, currency))}
        onFocus={(event) => event.target.select()}
        className={cn(
          'h-9 px-2.5 text-right tabular-nums',
          type === 'exact' &&
            (symbol.length > 2 ? 'pl-10' : symbol.length > 1 ? 'pl-8' : 'pl-6'),
          type === 'percent' && 'pr-6'
        )}
      />
      {type === 'percent' && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground'
        >
          {adornment}
        </span>
      )}
    </div>
  );
}
