import { useState } from 'react';

import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { ViewerName } from '@/components/viewer-name';
import {
  getMemberRemovalImpact,
  previewBalanceChange,
  removeMember,
  type Group,
  type Member,
  type MemberRemovalImpact,
} from '@/domain';
import {
  isInfrastructureError,
  toastUndoable,
  useGroupOperation,
  useViewer,
} from '@/features/groups/data';
import { describeBalanceChange } from '@/lib/balance-text';
import { plural } from '@/lib/plural';

interface RemoveMemberDialogProps {
  group: Group;
  /** The member being removed; `null` keeps everything closed. */
  member: Member | null;
  onClose: () => void;
}

/**
 * Removing a member with activity: one way only (ADR 0010). Their share in the
 * expenses they took part in is divided among the others; what they paid and
 * their payments are deleted. The dialog says so and shows how the accounts
 * change. A member without activity has no dialog at all: the tab removes
 * them right away and offers "Deshacer" (decision 64).
 */
export function RemoveMemberDialog({
  group,
  member,
  onClose,
}: RemoveMemberDialogProps) {
  const impact = member ? getMemberRemovalImpact(group, member.id) : null;
  const resolved = impact?.ok ? impact.value : null;

  if (!member || !resolved?.requiresStrategy) return null;

  return (
    <StrategyDialog
      key={member.id}
      group={group}
      member={member}
      impact={resolved}
      onClose={onClose}
    />
  );
}

/** "Se borran los 2 gastos que pagó y sus 3 pagos." (only what exists, in agreement). */
function deletionSentence(impact: MemberRemovalImpact): string | null {
  const paid = impact.paidExpenses.length;
  const payments = impact.payments.length;
  const items = [
    paid > 0 &&
      (paid === 1 ? 'el gasto que pagó' : `los ${paid} gastos que pagó`),
    payments > 0 && (payments === 1 ? 'su pago' : `sus ${payments} pagos`),
  ].filter(Boolean);
  if (items.length === 0) return null;
  const singular = items.length === 1 && paid + payments === 1;
  return `${singular ? 'Se borra' : 'Se borran'} ${items.join(' y ')}.`;
}

function StrategyDialog({
  group,
  member,
  impact,
  onClose,
}: {
  group: Group;
  member: Member;
  impact: MemberRemovalImpact;
  onClose: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const { viewerId } = useViewer();
  const [error, setError] = useState<string>();

  const after = removeMember(group, member.id, { type: 'redistribute' });
  const changes = after.ok ? previewBalanceChange(group, after.value) : [];
  const nameOf = (id: string) => group.members.find((m) => m.id === id);

  const shared = impact.redistributedExpenses.length;
  // Expenses that go away only because nobody else took part in them.
  const alone = impact.deletedExpenses.filter(
    (e) => e.payerId !== member.id
  ).length;
  const sentences = [
    shared > 0
      ? `Su parte en ${plural(shared, 'gasto', 'gastos')} se reparte entre los demás.`
      : null,
    deletionSentence(impact),
    alone > 0
      ? `${alone === 1 ? 'También se borra' : 'También se borran'} ${plural(alone, 'gasto', 'gastos')} en que solo participaba ${member.name}.`
      : null,
  ].filter((text): text is string => text !== null);

  async function confirm() {
    const result = await operation.run((g) =>
      removeMember(g, member.id, { type: 'redistribute' })
    );
    if (result.ok) {
      toastUndoable(`${member.name} fue eliminado del grupo`, result);
      onClose();
    } else if (isInfrastructureError(result.error)) {
      onClose();
    } else {
      setError(result.error.message);
    }
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Eliminar a ${member.name}`}
      description={sentences.join(' ')}
    >
      <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
        {changes.length > 0 && (
          <div className='grid grid-cols-[minmax(0,1fr)] gap-2'>
            <p className='text-sm font-medium'>Así cambian las cuentas</p>
            <ul className='grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-xl bg-secondary p-3 text-sm [overflow-wrap:anywhere]'>
              {changes.map((c) => (
                <li key={c.memberId}>
                  <ViewerName
                    name={nameOf(c.memberId)?.name ?? c.memberId}
                    isViewer={c.memberId === viewerId}
                  />
                  : {describeBalanceChange(c.before, c.after, group.currency)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {impact.expensesConvertedToAmounts.length > 0 && (
          <p className='text-sm'>
            Los gastos divididos por partes pasan a montos.
          </p>
        )}

        <p className='text-sm [overflow-wrap:anywhere] text-muted-foreground'>
          Si {member.name} sí participó en estos gastos, mejor no lo elimines.
        </p>

        {error && (
          <p role='alert' className='text-sm text-negative'>
            {error}
          </p>
        )}

        <ResponsiveDialogFooter>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type='button'
            variant='destructive'
            // A long member name must wrap instead of widening the sheet.
            className='h-auto min-h-11 py-2 text-wrap [overflow-wrap:anywhere] whitespace-normal'
            disabled={operation.isPending}
            onClick={() => void confirm()}
          >
            Eliminar a {member.name}
          </Button>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}
