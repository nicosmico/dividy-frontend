import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  onClose: () => void;
}
export function BottomSheet({
  isOpen = false,
  onClose,
  className,
  children,
  ...props
}: Props) {
  const [addTransitions, setAddTransitions] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    setAddTransitions(isOpen);

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOutsideClick = () => {
    if (addTransitions) {
      setAddTransitions(false);
    }
  };

  const handleCloseEnd = () => {
    !addTransitions && onClose();
  };

  return (
    <>
      <div
        className={twMerge(
          'fixed bottom-0 left-0 z-10 h-full w-full bg-black opacity-0 transition',
          addTransitions && 'opacity-50',
          !isOpen && 'hidden'
        )}
        onClick={handleOutsideClick}
        onTransitionEnd={handleCloseEnd}
      ></div>
      <div
        className={twMerge(
          'fixed inset-x-0 bottom-0 z-20 mx-auto my-auto max-h-[95%] max-w-3xl translate-y-full overflow-y-scroll rounded-t-xl bg-white px-4 py-10 transition md:top-0 md:max-h-fit md:max-w-2xl md:translate-y-0 md:rounded-xl md:px-8 md:opacity-0',
          addTransitions && 'translate-y-0 md:opacity-100',
          className,
          !isOpen && 'hidden'
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

export default BottomSheet;
