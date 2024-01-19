import { twMerge } from 'tailwind-merge';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}
export function BorderButton({ children, className, ...props }: Props) {
  return (
    <button
      type='button'
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full transition enabled:active:scale-95 disabled:opacity-60 disabled:active:opacity-60',
        'border-[2.5px] border-gray-900 px-[calc(2rem_-_2.5px)] py-[calc(0.75rem_-_2.5px)]',
        'hover:enabled:bg-gray-900 hover:enabled:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default BorderButton;
