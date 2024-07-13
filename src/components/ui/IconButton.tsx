import { twMerge } from 'tailwind-merge';

export function IconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type='button'
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full px-2 py-2 transition',
        'enabled:active:scale-90',
        'disabled:opacity-70 disabled:active:opacity-70',
        'md:hover:enabled:opacity-90 md:hover:enabled:brightness-90',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
