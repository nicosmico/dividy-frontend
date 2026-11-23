import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends React.HTMLAttributes<HTMLDialogElement> {
  open?: boolean; // Notify when open/close the dialog
  onClose?: () => void;
}
export function Dialog({ open, onClose, className, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [closing, setClosing] = useState(false); // To add animations
  const [prevOpen, setPrevOpen] = useState(false);

  // Sync the closing animation with the `open` prop while rendering
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  if (!!open !== prevOpen) {
    setPrevOpen(!!open);
    setClosing(!open);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target === dialog) setClosing(true);
    };
    dialog?.addEventListener('click', handleOutsideClick);

    return () => {
      dialog?.removeEventListener('click', handleOutsideClick);
      dialog?.close();
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    // Open dialog
    if (open) {
      dialogRef.current?.showModal();
    }

    // Block document scroll when open dialog
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const handleCloseAnimation = () => {
    setClosing(false);
    dialogRef.current?.close();
    onClose?.();
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className={twMerge(
          'inset-auto right-0 bottom-0 left-0 m-0 max-h-[90%] w-full max-w-full rounded-t-xl bg-white backdrop:bg-black/25 md:top-0 md:m-auto md:max-w-xl md:rounded-xl',
          'open:animate-fade-in-slide-up open:backdrop:animate-fade-in',
          closing && 'pointer-events-none open:animate-fade-out-slide-down'
        )}
        onAnimationEnd={() => {
          if (closing) handleCloseAnimation();
        }}
      >
        <div className={twMerge('px-4 py-10', className)}>{children}</div>
      </dialog>
    </>
  );
}

export default Dialog;
