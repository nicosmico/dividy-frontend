import { twMerge } from 'tailwind-merge';

interface Props {
  icon: JSX.Element;
  title: string;
  description?: string;
  className?: string;
}
export function Status({
  icon,
  title,
  description,
  className,
  ...props
}: Props) {
  return (
    <div
      className={twMerge(
        'grid place-content-center gap-2 text-center text-zinc-900',
        className
      )}
      {...props}
    >
      <div className='mx-auto w-min rounded-full bg-zinc-700 p-4 text-slate-50'>
        {icon}
      </div>
      <div>
        <span className='block text-lg font-bold'>{title}</span>
        <span className='block text-sm'>{description}</span>
      </div>
    </div>
  );
}

export default Status;
