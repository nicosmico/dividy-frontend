import { useLayoutEffect, useRef, type ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Bottom drawer on mobile, centered dialog from the `md` breakpoint up. Use it
 * for every form. Put the form (with its own buttons, see
 * `ResponsiveDialogFooter`) as `children`.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // These dialogs are opened by state, not by a Radix trigger, so Radix does
  // not know where to send focus when they close. Remember the opener and give
  // focus back to it (if it still exists; otherwise the caller picks a place).
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  const returnFocus = (event: Event) => {
    const el = opener.current;
    if (el && el.isConnected && el !== document.body) {
      event.preventDefault();
      el.focus();
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onCloseAutoFocus={returnFocus}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className='sr-only'>{title}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    // `repositionInputs={false}`: vaul's default resizes and moves the drawer
    // from `visualViewport` events when the iOS keyboard opens. On Safari iOS
    // the closing resize is not reported reliably, the drawer keeps the old
    // `bottom`/`height` and a white gap shows where the keyboard was. iOS
    // already scrolls the focused field into view, and the sheet is capped at
    // 90svh with its own scroll area, so the repositioning is not needed.
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        onCloseAutoFocus={returnFocus}
        // The drawer does not move focus in by itself: put it on the drawer
        // (not on the first field, so the on-screen keyboard stays closed).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : (
            <DrawerDescription className='sr-only'>{title}</DrawerDescription>
          )}
        </DrawerHeader>
        {/* overflow-x-hidden + overscroll-contain: safety net so no sheet can
            scroll sideways (iOS) or chain its scroll to the page. The 3px focus
            rings fit inside the px-4 (16px) gutter, so they are not clipped. */}
        <div className='overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Button row for the bottom of a form inside `ResponsiveDialog`. */
export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 pt-2 md:flex-row md:justify-end',
        className
      )}
      {...props}
    />
  );
}
