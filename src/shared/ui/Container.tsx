import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  children: React.ReactNode;
}
export function Container({ className, children }: Props) {
  return (
    <div className={twMerge('container mx-auto px-3', className)}>
      {children}
    </div>
  );
}

export default Container;
