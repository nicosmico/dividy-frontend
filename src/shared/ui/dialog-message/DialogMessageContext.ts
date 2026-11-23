import { createContext } from 'react';

export interface DialogMessageContent {
  id: string;
  message: string;
  title: string;
  buttons: {
    label: string;
    className?: string;
    onClick: () => void;
  }[];
}

export interface DialogMessageContextType {
  showDialog: (dialogMessage: Omit<DialogMessageContent, 'id'>) => void;
}

export const DialogMessageContext =
  createContext<DialogMessageContextType | null>(null);
