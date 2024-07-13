import { MouseEventHandler } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { IconButton } from '../ui';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  onIconClick?: MouseEventHandler<HTMLButtonElement>;
  register?: UseFormRegisterReturn<string>; // For react-hook-form
}
export function Input({ label, icon, onIconClick, register, ...props }: Props) {
  const id = register?.name
    ? `${register.name}-${crypto.randomUUID()}`
    : props.id;

  return (
    <div className='relative w-full'>
      <input
        id={id}
        placeholder={props.placeholder ?? '_'}
        {...props}
        {...register}
        className={twMerge(
          'text-md peer block w-full rounded-xl border-gray-200 p-4 outline-zinc-800 placeholder:text-transparent autofill:pb-2 autofill:pt-6 focus:border-zinc-800 focus:pb-2 focus:pt-6 focus:ring-zinc-800 disabled:pointer-events-none disabled:opacity-50 [&:not(:placeholder-shown)]:pb-2 [&:not(:placeholder-shown)]:pt-6',
          props.className,
          props.placeholder && 'focus:placeholder:text-gray-400',
          icon && 'pr-12'
        )}
      />

      <label
        htmlFor={id}
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
        <IconButton
          type='button'
          className='absolute inset-y-0 end-0 flex items-center'
          onClick={onIconClick}
        >
          {icon}
        </IconButton>
      )}
    </div>
  );
}

export default Input;
