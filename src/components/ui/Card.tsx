import { twMerge } from 'tailwind-merge';

export function Card({
  children,
  onClick,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        'rounded-xl bg-white px-4 py-2',
        onClick &&
          'transition hover:scale-105 hover:cursor-pointer active:scale-100',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
