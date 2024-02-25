import { IconAlertTriangle } from '@tabler/icons-react';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  errors: FieldError | Merge<FieldError, FieldErrorsImpl> | undefined; // TODO: Rename to error
}
export function InputError({ errors, ...props }: Props) {
  if (!errors) return;

  return (
    <div className='ml-1 mt-1 flex items-center gap-1 text-red-500'>
      <IconAlertTriangle size={12}></IconAlertTriangle>
      <span className='text-xs' {...props}>
        {(errors.message as string) ?? errors.root?.message}
      </span>
    </div>
  );
}
