import { twMerge } from 'tailwind-merge';

export function RoundedButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type='button'
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full px-8 py-3 transition enabled:active:scale-95 disabled:opacity-60 disabled:active:opacity-60',
        'md:hover:enabled:opacity-95 md:hover:enabled:brightness-95',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default RoundedButton;
