import { IconAlertTriangle } from '@tabler/icons-react';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  error: FieldError | Merge<FieldError, FieldErrorsImpl> | undefined;
}
export function InputError({ error, ...props }: Props) {
  if (!error) return;

  return (
    <div className='ml-1 mt-1 flex items-center gap-1 text-red-500'>
      <IconAlertTriangle size={12}></IconAlertTriangle>
      <span className='text-xs' {...props}>
        {(error.message as string) ?? error.root?.message}
      </span>
    </div>
  );
}
