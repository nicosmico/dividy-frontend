import { createContext, useCallback, useState } from 'react';
import Dialog from '../Dialog';
import RoundedButton from '../RoundedButton';

interface DialogMessageContent {
    id: string;
    message: string;
    title: string;
    buttons: {
        label: string;
        className?: string;
        onClick: () => void;
    }[];
}

interface DialogMessageContextType {
    showDialog: (dialogMessage: Omit<DialogMessageContent, 'id'>) => void;
}

export const DialogMessageContext = createContext<DialogMessageContextType | null>(null);

export function DialogMessageProvider({ children }: { children: React.ReactNode }) {
    const [dialogs, setDialogs] = useState<DialogMessageContent[]>([]);

    const showDialog = useCallback(({ title, message, buttons }: Omit<DialogMessageContent, 'id'>) => {
        const id = crypto.randomUUID();
        setDialogs((prev) => [...prev, { id, title, message, buttons }]);
    }, []);

    const handleClose = (id: string) => {
        setDialogs((prev) => prev.filter((msg) => msg.id !== id));
    };

    return (
        <DialogMessageContext.Provider value={{ showDialog }}>
            {children}
            {dialogs.map((dialog) => (
                <Dialog key={dialog.id} open={true} onClose={() => handleClose(dialog.id)} className='space-y-4'>
                    <h2 className='text-xl font-bold'>{dialog.title}</h2>
                    <p>{dialog.message}</p>
                    <div className='flex justify-end'>
                        {dialog.buttons.map((button) => (
                            <RoundedButton
                                key={button.label}
                                className={button.className}
                                onClick={() => {
                                    button.onClick();
                                    handleClose(dialog.id);
                                }}
                            >
                                {button.label}
                            </RoundedButton>
                        ))}
                    </div>
                </Dialog>
            ))}
        </DialogMessageContext.Provider>
    );
}
