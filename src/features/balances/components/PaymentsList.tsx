import { Trash2 } from 'lucide-react';
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
  formatAmount,
  removePayment,
  type Group,
  type Payment,
} from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
} from '@/features/groups/data';
import { formatDate } from '@/lib/dates';

/** Newest date first; on the same date, the most recently created first. */
function sortPayments(payments: readonly Payment[]): Payment[] {
  return [...payments].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
}

/** Registered payments, each removable after a confirmation. */
export function PaymentsList({ group }: { group: Group }) {
  const [removing, setRemoving] = useState<Payment | null>(null);
  const nameOf = (id: string) =>
    group.members.find((m) => m.id === id)?.name ?? 'alguien';

  return (
    <section aria-labelledby='payments-heading' className='grid gap-2'>
      <h2 id='payments-heading' className='text-sm font-semibold'>
        Pagos registrados
      </h2>
      <ul className='grid gap-2'>
        {sortPayments(group.payments).map((payment) => (
          <li key={payment.id}>
            <Card className='flex-row items-center gap-3 p-3 pl-4'>
              <div className='min-w-0 flex-1'>
                <p className='font-medium break-words'>
                  {nameOf(payment.fromId)} → {nameOf(payment.toId)}
                </p>
                <p className='text-sm text-muted-foreground'>
                  {formatDate(payment.date)}
                </p>
              </div>
              <p className='shrink-0 font-semibold tabular-nums'>
                {formatAmount(payment.amount)}
              </p>
              <Button
                variant='ghost'
                size='icon'
                aria-label={`Eliminar pago de ${nameOf(payment.fromId)} a ${nameOf(payment.toId)}`}
                onClick={() => setRemoving(payment)}
              >
                <Trash2 />
              </Button>
            </Card>
          </li>
        ))}
      </ul>
      <ConfirmRemove
        key={removing?.id ?? 'none'}
        group={group}
        payment={removing}
        onClose={() => setRemoving(null)}
      />
    </section>
  );
}

function ConfirmRemove({
  group,
  payment,
  onClose,
}: {
  group: Group;
  payment: Payment | null;
  onClose: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const confirming = useRef(false);
  if (!payment) return null;
  const nameOf = (id: string) =>
    group.members.find((m) => m.id === id)?.name ?? 'alguien';

  async function confirm(p: Payment) {
    if (confirming.current) return;
    confirming.current = true;
    const result = await operation.run((g) => removePayment(g, p.id));
    if (result.ok) toast.success('Pago eliminado');
    if (result.ok || isInfrastructureError(result.error)) onClose();
    else {
      confirming.current = false;
      toast.error(result.error.message);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el pago de {formatAmount(payment.amount)} de{' '}
            {nameOf(payment.fromId)} a {nameOf(payment.toId)} y los saldos
            volverán a incluir esa deuda.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={operation.isPending}
            className='bg-destructive text-white hover:bg-destructive/90'
            onClick={(event) => {
              event.preventDefault();
              void confirm(payment);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
