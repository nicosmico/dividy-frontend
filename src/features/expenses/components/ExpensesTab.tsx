import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  formatAmount,
  getTotalSpent,
  type Expense,
  type Group,
} from '@/domain';
import { useCurrentGroup } from '@/features/groups/data';
import { MemberAvatar } from '@/features/members';
import { restoreFocusIfLost } from '@/lib/focus';
import { plural } from '@/lib/plural';
import { ExpenseDialog } from './ExpenseDialog';
import { dateLabel, groupByDate, sortExpenses } from './expense-list';

const MIN_MEMBERS = 2;

/** Expenses tab: total, compact list by date, and the create / edit dialog. */
export function ExpensesTab() {
  const group = useCurrentGroup();
  const [target, setTarget] = useState<Expense | 'new' | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const canAdd = group.members.length >= MIN_MEMBERS;
  const count = group.expenses.length;
  const days = groupByDate(sortExpenses(group.expenses));

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      {count > 0 ? (
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-sm text-muted-foreground'>Total del grupo</p>
            <p className='text-3xl font-bold tracking-tight break-words tabular-nums'>
              {formatAmount(getTotalSpent(group))}
            </p>
            <p className='text-sm text-muted-foreground'>
              {plural(count, 'gasto', 'gastos')}
            </p>
          </div>
          <AddExpenseButton
            ref={addButton}
            enabled={canAdd}
            floating
            onClick={() => setTarget('new')}
          />
        </div>
      ) : (
        <Card className='items-center gap-3 py-8 text-center'>
          <h2 className='text-lg font-semibold'>Aún no hay gastos</h2>
          <p className='max-w-xs text-sm text-muted-foreground'>
            Un gasto es algo que alguien pagó y que se reparte entre el grupo.
            Anótalo y Dividy calcula quién le debe a quién.
          </p>
          <AddExpenseButton
            ref={addButton}
            enabled={canAdd}
            onClick={() => setTarget('new')}
          />
        </Card>
      )}

      {!canAdd && <NeedMoreMembers group={group} />}

      {days.map((day) => (
        <section
          key={day.date}
          aria-label={dateLabel(day.date)}
          className='grid grid-cols-[minmax(0,1fr)] gap-2'
        >
          <h2 className='text-sm font-semibold text-muted-foreground'>
            {dateLabel(day.date)}
          </h2>
          <ul className='grid grid-cols-[minmax(0,1fr)] gap-2'>
            {day.expenses.map((expense) => (
              <li key={expense.id}>
                <ExpenseRow
                  group={group}
                  expense={expense}
                  onOpen={() => setTarget(expense)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Room so the floating button never covers the last expense. */}
      {count > 0 && <div aria-hidden='true' className='h-16 md:hidden' />}

      <ExpenseDialog
        group={group}
        target={target}
        onClose={() => {
          setTarget(null);
          // A deleted expense takes its row (the dialog's trigger) with it.
          restoreFocusIfLost(addButton.current);
        }}
      />
    </div>
  );
}

function AddExpenseButton({
  ref,
  enabled,
  floating = false,
  onClick,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  enabled: boolean;
  /** Fixed to the bottom of the screen on mobile; in place from `md`. */
  floating?: boolean;
  onClick: () => void;
}) {
  const button = (
    <Button
      ref={ref}
      size='lg'
      disabled={!enabled}
      onClick={onClick}
      className={floating ? 'w-full md:w-auto' : undefined}
    >
      <Plus /> Agregar gasto
    </Button>
  );
  if (!floating) return button;
  return (
    <div className='fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:w-auto md:max-w-none md:bg-none md:p-0'>
      {button}
    </div>
  );
}

function NeedMoreMembers({ group }: { group: Group }) {
  return (
    <p
      role='status'
      className='rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground'
    >
      Para agregar un gasto necesitas al menos {MIN_MEMBERS} miembros (ahora hay{' '}
      {group.members.length}).{' '}
      <Link
        to='../members'
        className='font-medium underline underline-offset-2'
      >
        Agregar miembros
      </Link>
    </p>
  );
}

function ExpenseRow({
  group,
  expense,
  onOpen,
}: {
  group: Group;
  expense: Expense;
  onOpen: () => void;
}) {
  const payer = group.members.find((m) => m.id === expense.payerId);
  const n = expense.split.participantIds.length;
  const everyone = n === group.members.length;
  return (
    <button
      type='button'
      onClick={onOpen}
      className='flex w-full flex-col gap-1 rounded-2xl border bg-card p-3 text-left shadow-soft transition-colors outline-none hover:bg-card/70 focus-visible:ring-[3px] focus-visible:ring-ring/40'
    >
      <span className='flex items-start justify-between gap-3'>
        <span className='min-w-0 font-medium break-words'>
          {expense.description}
        </span>
        <span className='shrink-0 font-semibold tabular-nums'>
          {formatAmount(expense.amount)}
        </span>
      </span>
      <span className='flex items-center gap-2 text-sm text-muted-foreground'>
        {payer && <MemberAvatar member={payer} className='size-5' />}
        <span className='min-w-0 break-words'>
          Pagó {payer?.name ?? 'alguien'} · entre {everyone ? 'todos' : n}
        </span>
      </span>
    </button>
  );
}
