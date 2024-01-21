import { IconDivide } from '@tabler/icons-react';
import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  size?: number;
}
export function DividyIcon({ className, size = 24 }: Props) {
  return (
    <div
      className={twMerge(
        'w-min rounded-xl bg-gray-900 p-2 text-white',
        className
      )}
    >
      <IconDivide size={size} className='rotate-45' />
    </div>
  );
}

export default DividyIcon;
