import { useContext } from 'react';
import { DialogMessageContext } from './DialogMessageContext';

export function useDialogMessage() {
  const context = useContext(DialogMessageContext);
  if (!context) {
    throw new Error(
      'useDialogMessage must be used within DialogMessageProvider'
    );
  }
  return context;
}
