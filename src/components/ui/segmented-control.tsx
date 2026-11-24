import { useRef } from 'react';

import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group, e.g. "Cómo se divide". */
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
}

/**
 * A compact single choice among a few options, drawn as a row of segments:
 * a `radiogroup` with one tab stop (the checked segment) where the arrow keys,
 * Home and End move the choice. It does not use Radix's radio group because
 * inside a `<form>` that one adds hidden inputs to the DOM, and a sheet must
 * not have anything lying outside its edges. Same look as the tab bar.
 */
function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  function move(index: number) {
    const next = (index + options.length) % options.length;
    onValueChange(options[next].value);
    items.current[next]?.focus();
  }

  return (
    <div
      role='radiogroup'
      aria-label={label}
      data-slot='segmented-control'
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-secondary p-1',
        className
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              items.current[index] = node;
            }}
            type='button'
            role='radio'
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-slot='segmented-control-item'
            data-state={checked ? 'checked' : 'unchecked'}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              const step =
                event.key === 'ArrowRight' || event.key === 'ArrowDown'
                  ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                    ? -1
                    : 0;
              if (step !== 0) {
                event.preventDefault();
                move(index + step);
              } else if (event.key === 'Home') {
                event.preventDefault();
                move(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                move(options.length - 1);
              }
            }}
            className={cn(
              'min-h-9 min-w-0 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none',
              'focus-visible:ring-[3px] focus-visible:ring-ring',
              'data-[state=checked]:bg-tab-active data-[state=checked]:text-tab-active-foreground data-[state=checked]:shadow-soft'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
