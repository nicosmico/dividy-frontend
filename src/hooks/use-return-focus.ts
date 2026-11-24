import { useLayoutEffect, useRef } from 'react';

/**
 * For dialogs opened by state, not by a Radix trigger: Radix does not know
 * where to send focus when they close. Remembers the element that had focus
 * when `open` became true and returns a handler for `onCloseAutoFocus` that
 * gives focus back to it (if it still exists; otherwise Radix decides).
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  return (event: Event) => {
    const el = opener.current;
    if (el && el.isConnected && el !== document.body) {
      event.preventDefault();
      el.focus();
    }
  };
}
