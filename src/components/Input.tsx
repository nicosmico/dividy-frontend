import { MouseEventHandler } from 'react';
import {
  FieldErrors,
  FieldValues,
  UseFormRegisterReturn,
} from 'react-hook-form';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: JSX.Element;
  onIconClick?: MouseEventHandler<HTMLButtonElement>;
  register?: UseFormRegisterReturn<string>; // For react-hook-form
  errors?: FieldErrors<FieldValues>; // For react-hook-form
}
export function Input({
  label,
  icon,
  onIconClick,
  register,
  errors,
  ...props
}: Props) {
  const error = register && errors ? errors[register.name] : undefined;

  return (
    <div className='relative'>
      <input
        id={register?.name ?? props.id}
        placeholder={props.placeholder ?? ''}
        {...props}
        {...register}
        className={`text-md peer block w-full rounded-xl border-gray-200 p-4 outline-gray-800 placeholder:text-transparent autofill:pb-2 autofill:pt-6 focus:border-gray-800 focus:pb-2 focus:pt-6 focus:ring-gray-800 focus:placeholder:text-gray-400 disabled:pointer-events-none disabled:opacity-50 [&:not(:placeholder-shown)]:pb-2 [&:not(:placeholder-shown)]:pt-6 ${props.className}`}
      />

      <label
        htmlFor={register?.name ?? props.id}
        className='text-md pointer-events-none absolute start-0 top-0 h-full truncate border border-transparent p-4 transition duration-100 ease-in-out peer-focus:-translate-y-2.5 peer-focus:text-xs peer-focus:text-gray-700
          peer-disabled:pointer-events-none
          peer-disabled:opacity-50
          peer-[:not(:placeholder-shown)]:-translate-y-2.5
          peer-[:not(:placeholder-shown)]:text-xs
          peer-[:not(:placeholder-shown)]:text-gray-700'
      >
        {label}
      </label>

      {icon && (
        <button
          type='button'
          className='absolute inset-y-0 end-0 flex max-h-[56px] items-center pr-4'
          onClick={onIconClick}
        >
          {icon}
        </button>
      )}

      {error && (
        <p className='ml-1 mt-1 block text-xs text-red-500'>
          {error.message as String}
        </p>
      )}
    </div>
  );
}

export default Input;
