import { useLayoutEffect, useRef, type ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { currencyInfo, currencySymbol, type CurrencyCode } from '@/domain';
import { formatAmountTyping, normalizeAmountText } from './expense-form';

interface AmountInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> {
  currency: CurrencyCode;
  /** The text as shown (`"10.000"`, `"12,50"`). */
  value: string;
  onValueChange: (text: string) => void;
}

/**
 * Amount input in the group's currency: the prefix is the currency's symbol,
 * it shows thousands separators while typing (`10.000`), takes a decimal
 * comma (`12,50`) and keeps the caret next to the digit being edited. It does
 * not reject a comma in a currency without decimals: the form explains it.
 */
export function AmountInput({
  currency,
  value,
  onValueChange,
  className,
  ...props
}: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const symbol = currencySymbol(currency);
  const { decimals } = currencyInfo(currency);
  // Digits and the comma before the caret: what survives reformatting.
  const digitsBeforeCaret = useRef<number | null>(null);

  function restoreCaret() {
    const input = ref.current;
    const wanted = digitsBeforeCaret.current;
    if (!input || wanted === null) return;
    digitsBeforeCaret.current = null;
    let seen = 0;
    let index = 0;
    while (index < input.value.length && seen < wanted) {
      if (/[\d,]/.test(input.value[index])) seen++;
      index++;
    }
    input.setSelectionRange(index, index);
  }

  // Runs after React writes the formatted value, so the caret is not left at
  // the end (or at a random spot) when editing in the middle.
  useLayoutEffect(restoreCaret, [value]);

  return (
    <div className='relative'>
      <span
        aria-hidden='true'
        className='pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground'
      >
        {symbol}
      </span>
      <Input
        ref={ref}
        {...props}
        type='text'
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        autoComplete='off'
        placeholder={decimals > 0 ? '0,00' : '0'}
        className={`tabular-nums ${className ?? ''}`}
        // Room for the prefix: its width in characters plus the gutters.
        style={{ paddingLeft: `calc(0.875rem + ${symbol.length}ch + 0.5rem)` }}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          const caret = event.target.selectionStart ?? raw.length;
          const next = formatAmountTyping(raw, currency);
          digitsBeforeCaret.current = Math.min(
            raw.slice(0, caret).replace(/[^\d,]/g, '').length,
            next.replace(/[^\d,]/g, '').length
          );
          onValueChange(next);
          // Nothing re-renders when the text did not change (a letter was
          // typed): put the caret back ourselves.
          if (next === value) queueMicrotask(restoreCaret);
        }}
        onBlur={(event) => {
          onValueChange(normalizeAmountText(value, currency));
          props.onBlur?.(event);
        }}
      />
    </div>
  );
}
