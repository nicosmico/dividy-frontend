import { twMerge } from 'tailwind-merge';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}
export function IconButton({ children, className, ...props }: Props) {
  return (
    <button
      type='button'
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full px-4 py-3 transition enabled:active:scale-95 disabled:opacity-60 disabled:active:opacity-60',
        'hover:enabled:opacity-90 hover:enabled:brightness-90',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
