import { XIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/use-return-focus';
import { cn } from '@/lib/utils';

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Soft text under the title (for example the group name). */
  description: string;
  /** Rendered in a flex column that fills what the header leaves. */
  children: ReactNode;
  className?: string;
}

/**
 * A full-screen page on mobile (`100dvh`, safe areas respected) and a centered
 * dialog of fixed height from the `md` breakpoint up. It has a fixed header
 * with the title and a close button; the content (`children`) fills the rest
 * and brings its own scrolling body and pinned footer.
 */
export function PageDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: PageDialogProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        onCloseAutoFocus={returnFocus}
        // Focus the dialog, not the first control: nothing scrolls on open.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus({
            preventScroll: true,
          });
        }}
        className={cn(
          'top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none',
          'md:top-1/2 md:left-1/2 md:h-[min(46rem,calc(100dvh-2rem))] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:border',
          className
        )}
      >
        <div
          data-slot='page-dialog-header'
          className='flex shrink-0 items-center gap-2 border-b border-border/60 pt-[max(0.75rem,env(safe-area-inset-top))] pr-2 pb-2.5 pl-4'
        >
          <div className='grid min-w-0 flex-1'>
            <DialogTitle className='text-lg font-bold'>{title}</DialogTitle>
            <DialogDescription className='truncate text-[0.8125rem]'>
              {description}
            </DialogDescription>
          </div>
          <DialogClose
            aria-label='Cerrar'
            className='inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40'
          >
            <XIcon className='size-5' aria-hidden='true' />
          </DialogClose>
        </div>
        <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
