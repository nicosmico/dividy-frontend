import { Link, LinkProps } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

interface Props extends LinkProps {
  disabled?: boolean;
}
export function RoundedLink({
  children,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <Link
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full px-8 py-3 transition enabled:active:scale-95',
        'md:hover:enabled:opacity-95 md:hover:enabled:brightness-95',
        disabled && 'bg-gray-200 text-gray-400 active:bg-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export default RoundedLink;
