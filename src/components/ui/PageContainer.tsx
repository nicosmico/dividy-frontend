import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  children: ReactNode;
}
export function PageContainer({ className, children }: Props) {
  return (
    <div className={twMerge('container mx-auto px-3 pb-4 pt-8', className)}>
      {children}
    </div>
  );
}

export default PageContainer;
