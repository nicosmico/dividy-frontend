import { useContext } from 'react';
import { SnackBarContext } from './SnackBarProvider';

export function useSnackBar() {
  const context = useContext(SnackBarContext);
  if (!context) {
    throw new Error('useSnackBar must be used within SnackBarProvider');
  }
  return context;
}
