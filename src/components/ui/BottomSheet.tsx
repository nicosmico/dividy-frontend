import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  onClose?: () => void;
}
export function BottomSheet({
  isOpen = false,
  onClose,
  className,
  children,
  ...props
}: Props) {
  const [openTransition, setOpenTransition] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    setOpenTransition(isOpen);
  }, [isOpen]);

  if (!isOpen) {
    return;
  }

  return (
    <>
      <div
        className={twMerge(
          'fixed bottom-0 left-0 z-10 h-full w-full bg-black opacity-0 transition',
          openTransition && 'opacity-50'
        )}
        onClick={() => setOpenTransition(false)}
        onTransitionEnd={() => !openTransition && onClose && onClose()}
      ></div>
      <div
        className={twMerge(
          'fixed inset-x-0 bottom-0 z-20 mx-auto my-auto max-h-[95%] max-w-3xl translate-y-full overflow-y-scroll rounded-t-xl bg-white px-4 py-10 transition md:top-0 md:max-h-fit md:max-w-2xl md:translate-y-0 md:rounded-xl md:px-8 md:opacity-0',
          openTransition && 'translate-y-0 md:opacity-100',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

export default BottomSheet;
