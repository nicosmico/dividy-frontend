import { useLayoutEffect, useRef, type ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { formatDigits, onlyDigits } from './expense-form';

interface AmountInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> {
  /** Digits only (`"10000"`). */
  value: string;
  onValueChange: (digits: string) => void;
}

/**
 * Pesos input: shows thousands separators while typing (`10.000`), accepts
 * only digits and keeps the caret next to the digit being edited.
 */
export function AmountInput({
  value,
  onValueChange,
  className,
  ...props
}: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);

  function restoreCaret() {
    const input = ref.current;
    const wanted = digitsBeforeCaret.current;
    if (!input || wanted === null) return;
    digitsBeforeCaret.current = null;
    let seen = 0;
    let index = 0;
    while (index < input.value.length && seen < wanted) {
      if (/\d/.test(input.value[index])) seen++;
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
        $
      </span>
      <Input
        ref={ref}
        {...props}
        type='text'
        inputMode='numeric'
        autoComplete='off'
        placeholder='0'
        className={`pl-8 tabular-nums ${className ?? ''}`}
        value={formatDigits(value)}
        onChange={(event) => {
          const raw = event.target.value;
          const caret = event.target.selectionStart ?? raw.length;
          const digits = onlyDigits(raw);
          digitsBeforeCaret.current = Math.min(
            raw.slice(0, caret).replace(/\D/g, '').length,
            digits.length
          );
          onValueChange(digits);
          // Nothing re-renders when the digits did not change (a letter was
          // typed): put the caret back ourselves.
          if (digits === value) queueMicrotask(restoreCaret);
        }}
      />
    </div>
  );
}
