import { FieldError } from 'react-hook-form';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  errors?: FieldError;
}
export function InputError({ errors, ...props }: Props) {
  if (!errors) return;

  return (
    <span className='ml-1 mt-1 block text-xs text-red-500' {...props}>
      {errors.message as String}
    </span>
  );
}

export default InputError;
