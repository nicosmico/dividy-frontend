import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      className={cn(
        'peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-input outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-field',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className='pointer-events-none block size-5 translate-x-1 rounded-full bg-muted-foreground transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-foreground motion-reduce:transition-none'
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
