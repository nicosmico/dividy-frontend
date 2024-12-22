import { UseFormRegisterReturn } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';

const arrowIcon =
  'bg-[url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAMAAACtdX32AAAAdVBMVEUAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhMdQaAAAAJ3RSTlMAAAECAwQGBwsOFBwkJTg5RUZ4eYCHkJefpaytrsXGy8zW3+Do8vNn0bsyAAAAYElEQVR42tXROwJDQAAA0Ymw1p9kiT+L5P5HVEi3qJn2lcPjtIuzUIJ/rhIGy762N3XaThqMN1ZPALsZPEzG1x8LrFL77DHBnEMxBewz0fJ6LyFHTPL7xhwzWYrJ9z22AqmQBV757MHfAAAAAElFTkSuQmCC)]';

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  register?: UseFormRegisterReturn<string>; // For react-hook-form
}
export function Select({
  label,
  register,
  children,
  className,
  ...props
}: Props) {
  const id = register?.name
    ? `${register.name}-${crypto.randomUUID()}`
    : props.id;

  return (
    <div className='relative w-full'>
      <select
        id={id}
        {...props}
        {...register}
        className={twMerge(
          'peer block w-full appearance-none rounded-xl border-transparent p-4 outline-zinc-800 focus:border-zinc-800 focus:ring-zinc-800 disabled:pointer-events-none disabled:opacity-50 has-[option:checked]:pb-2 has-[option:checked]:pt-6',
          'appearance-none bg-right bg-no-repeat',
          arrowIcon,
          className
        )}
      >
        {children}
      </select>
      <label
        htmlFor={id}
        className={twMerge(
          'text-md pointer-events-none absolute start-0 top-0 h-full truncate border border-transparent p-4 transition duration-100 ease-in-out',
          'peer-has-[option:checked]:-translate-y-2.5 peer-has-[option:checked]:text-xs peer-has-[option:checked]:text-gray-700'
        )}
      >
        {label}
      </label>
    </div>
  );
}

export default Select;
