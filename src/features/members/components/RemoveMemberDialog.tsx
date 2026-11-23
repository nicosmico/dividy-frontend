import { useState } from 'react';
import { toast } from 'sonner';

import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatAmount,
  getMemberRemovalImpact,
  removeMember,
  type Group,
  type Member,
  type MemberRemovalImpact,
  type RemoveMemberStrategy,
} from '@/domain';
import {
  isInfrastructureError,
  useGroupOperation,
} from '@/features/groups/data';

interface RemoveMemberDialogProps {
  group: Group;
  /** The member being removed; `null` keeps everything closed. */
  member: Member | null;
  onClose: () => void;
}

/**
 * Removing a member without activity asks for a plain confirmation; with
 * activity it shows a preview and asks to reassign or cascade-delete.
 */
export function RemoveMemberDialog({
  group,
  member,
  onClose,
}: RemoveMemberDialogProps) {
  const impact = member ? getMemberRemovalImpact(group, member.id) : null;
  const resolved = impact?.ok ? impact.value : null;

  if (!member || !resolved) return null;

  return resolved.requiresStrategy ? (
    <StrategyDialog
      key={member.id}
      group={group}
      member={member}
      impact={resolved}
      onClose={onClose}
    />
  ) : (
    <ConfirmDialog group={group} member={member} onClose={onClose} />
  );
}

function ConfirmDialog({
  group,
  member,
  onClose,
}: {
  group: Group;
  member: Member;
  onClose: () => void;
}) {
  const operation = useGroupOperation(group.id);
  const [error, setError] = useState<string>();

  async function confirm() {
    const result = await operation.run((g) =>
      removeMember(g, member.id, { type: 'none' })
    );
    if (result.ok) {
      toast.success(`${member.name} fue eliminado del grupo`);
      onClose();
    } else if (isInfrastructureError(result.error)) {
      onClose();
    } else {
      setError(result.error.message);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {member.name} no tiene gastos ni pagos en el grupo. Se quitará de la
            lista de miembros.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={operation.isPending}
            className='bg-destructive text-white hover:bg-destructive/90'
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Choice = 'reassign' | 'cascade';

function pluralize(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
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
  const [choice, setChoice] = useState<Choice | null>(null);
  const [targetId, setTargetId] = useState<string>('');
  const [error, setError] = useState<string>();

  const others = group.members.filter((m) => m.id !== member.id);
  const target = others.find((m) => m.id === targetId);
  const canConfirm =
    choice === 'cascade' || (choice === 'reassign' && target !== undefined);

  const betweenBoth = target
    ? impact.payments.filter(
        (p) => p.fromId === target.id || p.toId === target.id
      ).length
    : 0;
  const deleted = impact.expensesDeletedByCascade;
  const deletedIds = new Set(deleted.map((e) => e.id));
  const changedShares = impact.participatingExpenses.filter(
    (e) => !deletedIds.has(e.id)
  );

  async function confirm() {
    let strategy: RemoveMemberStrategy;
    if (choice === 'reassign' && target) {
      strategy = { type: 'reassign', toMemberId: target.id };
    } else if (choice === 'cascade') {
      strategy = { type: 'cascade' };
    } else return;
    const result = await operation.run((g) =>
      removeMember(g, member.id, strategy)
    );
    if (result.ok) {
      toast.success(`${member.name} fue eliminado del grupo`);
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
      description={`${member.name} tiene movimientos en el grupo. Elige qué hacer con ellos.`}
    >
      <div className='grid gap-4'>
        <ul className='grid gap-1 rounded-xl bg-secondary p-3 text-sm'>
          <li>
            Pagó {pluralize(impact.paidExpenses.length, 'gasto', 'gastos')}
          </li>
          <li>
            Participa en{' '}
            {pluralize(impact.participatingExpenses.length, 'gasto', 'gastos')}
          </li>
          <li>
            {impact.payments.length === 1
              ? 'Tiene 1 pago enviado o recibido'
              : `Tiene ${impact.payments.length} pagos enviados o recibidos`}
          </li>
        </ul>

        <RadioGroup
          value={choice ?? ''}
          onValueChange={(value) => {
            setChoice(value as Choice);
            setError(undefined);
          }}
          aria-label='Qué hacer con sus movimientos'
        >
          <div className='grid gap-3 rounded-xl border p-3'>
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='reassign' id='remove-reassign' />
              <Label htmlFor='remove-reassign' className='flex-1 py-2'>
                Reasignar a…
              </Label>
            </div>
            {choice === 'reassign' && (
              <div className='grid gap-2 pl-8'>
                <p className='text-sm text-muted-foreground'>
                  Sus gastos y pagos pasan a otra persona del grupo.
                </p>
                {betweenBoth > 0 && (
                  <p className='text-sm'>
                    {pluralize(betweenBoth, 'pago', 'pagos')} entre ambos se
                    eliminará{betweenBoth === 1 ? '' : 'n'}, porque nadie se
                    paga a sí mismo.
                  </p>
                )}
                <Label htmlFor='remove-target' className='sr-only'>
                  Miembro destino
                </Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger id='remove-target'>
                    <SelectValue placeholder='Elige un miembro' />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='grid gap-3 rounded-xl border p-3'>
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='cascade' id='remove-cascade' />
              <Label htmlFor='remove-cascade' className='flex-1 py-2'>
                Eliminar con sus gastos
              </Label>
            </div>
            {choice === 'cascade' && (
              <div className='grid gap-2 pl-8 text-sm'>
                {deleted.length > 0 ? (
                  <>
                    <p>
                      Se borrarán {pluralize(deleted.length, 'gasto', 'gastos')}
                      :
                    </p>
                    <ul className='list-disc pl-5 text-muted-foreground'>
                      {deleted.map((e) => (
                        <li key={e.id}>
                          {e.description} ({formatAmount(e.amount)})
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>No se borrará ningún gasto.</p>
                )}
                {impact.payments.length > 0 && (
                  <p>
                    También se borrarán{' '}
                    {pluralize(impact.payments.length, 'pago', 'pagos')} que
                    envió o recibió.
                  </p>
                )}
                {changedShares.length > 0 && (
                  <p>
                    Se quitará de{' '}
                    {pluralize(changedShares.length, 'gasto', 'gastos')} donde
                    participa, así que las partes de los demás cambian.
                  </p>
                )}
              </div>
            )}
          </div>
        </RadioGroup>

        {error && (
          <p role='alert' className='text-sm text-destructive'>
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
            disabled={!canConfirm || operation.isPending}
            onClick={() => void confirm()}
          >
            Eliminar a {member.name}
          </Button>
        </ResponsiveDialogFooter>
      </div>
    </ResponsiveDialog>
  );
}
