import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends React.HTMLAttributes<HTMLDialogElement> {
  open?: boolean; // Notify when open/close the dialog
  onClose?: () => void;
}
export function Dialog({ open, onClose, className, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [_open, _setOpen] = useState(false); // To save dialog state
  const [closing, setClosing] = useState(false); // To add animations

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      e.target === dialogRef.current && startCloseDialog();
    };
    dialogRef.current?.addEventListener('click', handleOutsideClick);

    return () => {
      dialogRef.current?.removeEventListener('click', handleOutsideClick);
      dialogRef.current?.close();
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    // Open dialog
    if (open) {
      dialogRef.current?.showModal();
      _setOpen(true);
      setClosing(false);
    }

    // Close dialog if it's alerady opened
    if (!open && _open) {
      startCloseDialog();
    }

    // Block document scroll when open dialog
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const handleCloseAnimation = () => {
    setClosing(false);
    dialogRef.current?.close();
    onClose?.();
  };

  const startCloseDialog = () => {
    setClosing(true);
    _setOpen(false);
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className={twMerge(
          'inset-auto bottom-0 left-0 right-0 m-0 max-h-[90%] w-full max-w-full rounded-t-xl bg-white backdrop:bg-black/25 md:top-0 md:m-auto md:max-w-xl md:rounded-xl',
          'open:backdrop:animate-fade-in open:animate-fade-in-slide-up',
          closing && 'open:animate-fade-out-slide-down pointer-events-none'
        )}
        onAnimationEnd={() => closing && handleCloseAnimation()}
      >
        <div className={twMerge('px-4 py-10', className)}>{children}</div>
      </dialog>
    </>
  );
}

export default Dialog;
