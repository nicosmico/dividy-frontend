import { ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
}
export function Container({ className, children }: Props) {
  return (
    <div className={`container mx-auto px-2 ${className}`}>{children}</div>
  );
}

export default Container;
