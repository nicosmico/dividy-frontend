import { useEffect, useState } from 'react';
import { toast, Toaster as Sonner, useSonner, type ToasterProps } from 'sonner';

/**
 * True while a modal (drawer, dialog or alert dialog) is open. Radix and vaul
 * lock the page scroll with `data-scroll-locked` on `<body>`.
 */
function useModalOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () =>
      setOpen(document.body.hasAttribute('data-scroll-locked'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked'],
    });
    return () => observer.disconnect();
  }, []);
  return open;
}

/**
 * Keeps a single toast on screen: a new one replaces the previous ones.
 *
 * Sonner stacks toasts and, while the pointer is over the stack, expands it
 * and pauses every timer. On iOS a tap leaves that "hover" behind, so after
 * tapping "Deshacer" the older toasts stayed expanded and never closed,
 * covering the bottom of the list. One toast at a time avoids the stack.
 */
function useSingleToast() {
  const { toasts } = useSonner();
  useEffect(() => {
    // `toasts` is newest first.
    for (const old of toasts.slice(1)) toast.dismiss(old.id);
  }, [toasts]);
}

function Toaster(props: ToasterProps) {
  // Bottom toasts would cover the footer buttons of a bottom sheet or dialog,
  // so while one is open they move to the top, where nothing interactive is.
  const modalOpen = useModalOpen();
  useSingleToast();
  return (
    <Sonner
      theme='light'
      visibleToasts={1}
      position={modalOpen ? 'top-center' : 'bottom-center'}
      // Same bottom offset on every width: the CSS variable accounts for the
      // safe area and for the floating "Agregar gasto" button (see index.css).
      offset={{ bottom: 'var(--toast-bottom)', top: 'var(--toast-top)' }}
      mobileOffset={{ bottom: 'var(--toast-bottom)', top: 'var(--toast-top)' }}
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
