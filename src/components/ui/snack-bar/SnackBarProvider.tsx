// src/components/ui/SnackBarProvider.tsx
import { createContext, useCallback, useState } from 'react';
import SnackBar from './SnackBar';

interface SnackBarMessage {
  id: string;
  message: string;
}

interface SnackBarContextType {
  showMessage: (message: string) => void;
}

export const SnackBarContext = createContext<SnackBarContextType | null>(null);

export function SnackBarProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<SnackBarMessage[]>([]);

  const showMessage = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 2000);
  }, []);

  const handleClose = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  return (
    <SnackBarContext.Provider value={{ showMessage }}>
      {children}
      <div className='sticky bottom-1 space-y-2 p-2'>
        {messages.map((msg) => (
          <div key={msg.id} className='animate-slide-up'>
            <SnackBar
              message={msg.message}
              onClose={() => handleClose(msg.id)}
            />
          </div>
        ))}
      </div>
    </SnackBarContext.Provider>
  );
}
