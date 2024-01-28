import { twMerge } from 'tailwind-merge';

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        'rounded-xl bg-white px-4 py-2',
        props.onClick &&
          'transition hover:cursor-pointer active:scale-100 md:hover:scale-[1.015]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
