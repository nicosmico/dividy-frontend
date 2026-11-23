import { useId, type ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Visible character counter next to the label, e.g. `12/80`. */
  counter?: { length: number; max: number };
  /** Receives the props the control needs to be accessible. */
  children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/**
 * Label + control + error message wired for accessibility. Works with
 * react-hook-form: `{(c) => <Input {...c} {...register('name')} />}`.
 */
export function FormField({
  label,
  error,
  hint,
  counter,
  children,
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = error || hint ? messageId : undefined;
  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <Label htmlFor={id}>{label}</Label>
        {counter && (
          <span
            className={cn(
              'text-xs tabular-nums',
              counter.length > counter.max
                ? 'font-medium text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {counter.length}/{counter.max}
          </span>
        )}
      </div>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={messageId} role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className='text-sm text-muted-foreground'>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
