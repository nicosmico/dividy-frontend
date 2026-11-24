import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

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
 * A compact single choice among a few options, drawn as a row of segments
 * (a radio group underneath: one tab stop, arrow keys move the choice). Same
 * look as the tab bar: a `bg-surface-2` track and a raised active segment.
 */
function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot='segmented-control'
      aria-label={label}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-secondary p-1',
        className
      )}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          data-slot='segmented-control-item'
          className={cn(
            'min-h-9 min-w-0 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none',
            'focus-visible:ring-[3px] focus-visible:ring-ring',
            'data-[state=checked]:bg-tab-active data-[state=checked]:text-tab-active-foreground data-[state=checked]:shadow-soft'
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { SegmentedControl };
