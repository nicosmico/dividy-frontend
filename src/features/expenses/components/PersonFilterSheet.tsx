import { Check } from 'lucide-react';
import { useState } from 'react';

import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  filterExpenses,
  type ExpenseFilter,
  type Group,
  type MemberId,
} from '@/domain';
import { MemberAvatar } from '@/features/members';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

type PersonMode = 'member' | 'paidby';

const MODES: { value: PersonMode; label: string }[] = [
  { value: 'member', label: 'Donde participa' },
  { value: 'paidby', label: 'Lo que pagó' },
];

interface PersonFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  viewerId: MemberId | null;
  /** The filter in force, to start from it when it is a person's. */
  current: ExpenseFilter | null;
  /** The search in force: the count on the button includes it. */
  query: string;
  onApply: (filter: ExpenseFilter | null) => void;
}

/** "Gastos de una persona": pick a member and whether to see where they take part or what they paid. */
export function PersonFilterSheet({
  open,
  onOpenChange,
  ...form
}: PersonFilterSheetProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Gastos de una persona'
      description='Elige a alguien para ver solo sus gastos.'
    >
      {/* Mounted only while open, so each opening starts from the filter in force. */}
      <PersonFilterForm {...form} close={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
}

function PersonFilterForm({
  group,
  viewerId,
  current,
  query,
  onApply,
  close,
}: Omit<PersonFilterSheetProps, 'open' | 'onOpenChange'> & {
  close: () => void;
}) {
  const person =
    current?.kind === 'member' || current?.kind === 'paidby' ? current : null;
  const [memberId, setMemberId] = useState<MemberId | null>(
    person?.memberId ?? null
  );
  const [mode, setMode] = useState<PersonMode>(person?.kind ?? 'member');
  const chosen = group.members.find((m) => m.id === memberId);
  const count = chosen
    ? filterExpenses(
        group,
        { kind: mode, memberId: chosen.id },
        query,
        viewerId
      ).length
    : 0;

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4 pb-1'>
      <ul
        aria-label='Integrantes'
        className='grid max-h-[40svh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-1'
      >
        {group.members.map((member) => {
          const selected = member.id === memberId;
          return (
            <li key={member.id} className='min-w-0'>
              <button
                type='button'
                aria-pressed={selected}
                onClick={() => setMemberId(member.id)}
                className={cn(
                  'flex min-h-16 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-tile border p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[0.98] motion-reduce:active:scale-100',
                  selected
                    ? 'border-transparent bg-accent text-accent-foreground'
                    : 'border-border bg-card hover:bg-secondary'
                )}
              >
                <MemberAvatar member={member} decorative />
                <span className='min-w-0 flex-1 font-medium break-words'>
                  {member.id === viewerId ? `${member.name} (tú)` : member.name}
                </span>
                {selected && <Check aria-hidden='true' className='size-4' />}
              </button>
            </li>
          );
        })}
      </ul>
      <SegmentedControl
        label='Qué mostrar'
        value={mode}
        onValueChange={setMode}
        options={MODES}
      />
      <ResponsiveDialogFooter className='pt-0'>
        {person && (
          <Button
            variant='outline'
            onClick={() => {
              onApply(null);
              close();
            }}
          >
            Quitar filtro
          </Button>
        )}
        <Button
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            onApply({ kind: mode, memberId: chosen.id });
            close();
          }}
        >
          {chosen
            ? `Ver ${plural(count, 'gasto', 'gastos')} de ${chosen.name}`
            : 'Ver gastos'}
        </Button>
      </ResponsiveDialogFooter>
    </div>
  );
}
