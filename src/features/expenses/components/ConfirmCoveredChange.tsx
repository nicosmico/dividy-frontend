import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import type { BalanceChange, CurrencyCode, Member } from '@/domain';
import { describeBalance } from '@/lib/balance-text';
import { cn } from '@/lib/utils';

export type CoveredChangeKind = 'delete' | 'save';

interface ConfirmCoveredChangeProps {
  kind: CoveredChangeKind;
  changes: BalanceChange[];
  members: Member[];
  currency: CurrencyCode;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Warns that an expense already considered in registered payments is about to
 * change the balances, and shows who is affected. Cancel is focused by default
 * (Radix); the destructive button is a deliberate choice.
 */
export function ConfirmCoveredChange({
  kind,
  changes,
  members,
  currency,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmCoveredChangeProps) {
  // AlertDialog has no trigger here (it opens by state), and Radix cancels its
  // own focus return, so remember who opened it and give the focus back.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener?.isConnected && opener !== document.body) opener.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            Ya hay pagos registrados después de este gasto
          </AlertDialogTitle>
          <AlertDialogDescription>
            Si lo {kind === 'delete' ? 'eliminas' : 'guardas así'}, los saldos
            cambian:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className='grid gap-1.5 rounded-xl bg-secondary/60 p-3 text-sm [overflow-wrap:anywhere]'>
          {changes.map((c) => (
            <li key={c.memberId}>
              {`${nameOf(c.memberId)}: ${describeBalance(c.before, currency)} → ${describeBalance(c.after, currency)}`}
            </li>
          ))}
        </ul>
        <AlertDialogFooter className='flex-col'>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {kind === 'delete'
              ? 'Eliminar de todas formas'
              : 'Guardar de todas formas'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
