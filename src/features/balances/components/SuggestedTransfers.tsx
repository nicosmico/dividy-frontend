import { ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  addPayment,
  formatAmount,
  type Group,
  type SuggestedTransfer,
} from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
  useServices,
} from '@/features/groups/data';
import { MemberAvatar, useMemberMoods } from '@/features/members';
import { useReadOnly } from '@/hooks/use-snapshot-view';
import { todayLocal } from '@/lib/dates';

/**
 * What to do to settle up, with "Marcar como pagado" on each transfer (not in
 * the read-only view of a snapshot, where it is only the list).
 */
export function SuggestedTransfers({
  group,
  transfers,
}: {
  group: Group;
  transfers: SuggestedTransfer[];
}) {
  const readOnly = useReadOnly();
  const [paying, setPaying] = useState<SuggestedTransfer | null>(null);
  const moods = useMemberMoods(group);
  const nameOf = (id: string) => group.members.find((m) => m.id === id);

  return (
    <section aria-labelledby='transfers-heading' className='grid gap-2'>
      <h2 id='transfers-heading' className='text-sm font-semibold'>
        Para quedar al día
      </h2>
      <ul className='grid gap-2'>
        {transfers.map((t) => {
          const from = nameOf(t.fromId);
          const to = nameOf(t.toId);
          if (!from || !to) return null;
          return (
            <li key={`${t.fromId}-${t.toId}`}>
              <Card className='gap-3'>
                <div className='flex items-center gap-2'>
                  <MemberAvatar member={from} mood={moods.get(from.id)} />
                  <ArrowRight
                    aria-hidden='true'
                    className='size-4 shrink-0 text-muted-foreground'
                  />
                  <MemberAvatar member={to} mood={moods.get(to.id)} />
                  <p className='min-w-0 flex-1 text-right text-xl font-bold tabular-nums'>
                    {formatAmount(t.amount)}
                  </p>
                </div>
                <p className='font-medium break-words'>
                  {from.name} → {to.name}
                </p>
                {!readOnly && (
                  <Button
                    variant='accent'
                    aria-label={`Marcar como pagado: ${from.name} le transfiere ${formatAmount(t.amount)} a ${to.name}`}
                    onClick={() => setPaying(t)}
                  >
                    Marcar como pagado
                  </Button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      {!readOnly && (
        <ConfirmPayment
          key={paying ? `${paying.fromId}-${paying.toId}` : 'none'}
          group={group}
          transfer={paying}
          onClose={() => setPaying(null)}
        />
      )}
    </section>
  );
}

function ConfirmPayment({
  group,
  transfer,
  onClose,
}: {
  group: Group;
  transfer: SuggestedTransfer | null;
  onClose: () => void;
}) {
  const { now, newId } = useServices();
  const operation = useGroupOperation(group.id);
  const [error, setError] = useState<string>();
  // One payment per confirmation, even with a double click.
  const confirming = useRef(false);
  if (!transfer) return null;
  const from = group.members.find((m) => m.id === transfer.fromId);
  const to = group.members.find((m) => m.id === transfer.toId);
  if (!from || !to) return null;

  async function confirm(t: SuggestedTransfer) {
    if (confirming.current) return;
    confirming.current = true;
    const result = await operation.run((g) =>
      addPayment(g, {
        id: newId(),
        fromId: t.fromId,
        toId: t.toId,
        amount: t.amount,
        date: todayLocal(),
        createdAt: now(),
      })
    );
    if (result.ok) {
      toast.success('Pago registrado');
      onClose();
    } else if (isInfrastructureError(result.error)) {
      onClose();
    } else {
      confirming.current = false;
      setError(result.error.message);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿{from.name} le transfirió {formatAmount(transfer.amount)} a{' '}
            {to.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se registrará un pago por ese monto y los saldos se actualizarán.
            Podrás eliminarlo desde Pagos registrados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role='alert' className='text-sm text-negative'>
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={operation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void confirm(transfer);
            }}
          >
            Sí, registrar pago
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
