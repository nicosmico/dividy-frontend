import * as React from 'react';

import { cn } from '@/lib/utils';

const NATIVE_PICKER_TYPES = ['date', 'time', 'datetime-local'];

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  const isNativePicker =
    type !== undefined && NATIVE_PICKER_TYPES.includes(type);
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'h-11 w-full min-w-0 rounded-field border border-input bg-field px-3.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground md:text-sm',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring-soft',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative aria-invalid:ring-negative/20',
        // iOS Safari: native date/time controls have an intrinsic minimum
        // width that `w-full` cannot shrink while they are `display: flex`
        // with native appearance, so they overflow (and the overflow becomes
        // horizontal scroll in the sheet). Use block + appearance-none, align
        // the value to the left, and keep a min height because an empty
        // appearance-none control collapses to zero height on iOS.
        isNativePicker
          ? 'block min-h-11 appearance-none [&::-webkit-date-and-time-value]:text-left'
          : 'flex',
        className
      )}
      {...props}
    />
  );
}

export { Input };
