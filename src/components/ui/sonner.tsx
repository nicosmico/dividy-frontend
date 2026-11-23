import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

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

function Toaster(props: ToasterProps) {
  // Bottom toasts would cover the footer buttons of a bottom sheet or dialog,
  // so while one is open they move to the top, where nothing interactive is.
  const modalOpen = useModalOpen();
  return (
    <Sonner
      theme='light'
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
