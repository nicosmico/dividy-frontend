import { createContext } from 'react';

interface SnackBarContextType {
  showMessage: (message: string) => void;
}

export const SnackBarContext = createContext<SnackBarContextType | null>(null);
