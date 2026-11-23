import { useId, type ReactNode } from 'react';

import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
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
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const describedBy = error || hint ? messageId : undefined;
  return (
    <div className='grid gap-2'>
      <Label htmlFor={id}>{label}</Label>
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
