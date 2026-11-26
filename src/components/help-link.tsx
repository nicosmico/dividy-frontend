import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

/** Small, muted link to a help page (an answer in "Preguntas frecuentes"). */
export function HelpLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        'inline-block w-fit rounded-sm py-1 text-sm text-muted-foreground underline decoration-muted-foreground/50 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className
      )}
      {...props}
    />
  );
}
