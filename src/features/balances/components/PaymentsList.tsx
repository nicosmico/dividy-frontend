import { Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

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
  toastUndoable,
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

/** Registered payments, each removable with an undo. */
export function PaymentsList({ group }: { group: Group }) {
  const operation = useGroupOperation(group.id);
  const removing = useRef(false);
  const nameOf = (id: string) =>
    group.members.find((m) => m.id === id)?.name ?? 'alguien';

  /** No confirmation: the toast offers "Deshacer" (decision 64). */
  async function remove(payment: Payment) {
    if (removing.current) return;
    removing.current = true;
    const result = await operation.run((g) => removePayment(g, payment.id));
    removing.current = false;
    if (result.ok) toastUndoable('Pago eliminado', result);
    else if (!isInfrastructureError(result.error))
      toast.error(result.error.message);
  }

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
                disabled={operation.isPending}
                onClick={() => void remove(payment)}
              >
                <Trash2 />
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
