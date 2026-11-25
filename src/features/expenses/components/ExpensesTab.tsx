import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  expenseShareOf,
  filterExpenses,
  formatAmount,
  splitTypeLabel,
  summarizeExpenses,
  type Expense,
  type Group,
  type MemberId,
} from '@/domain';
import { useCurrentGroup } from '@/features/groups/data';
import { EntityIcon } from '@/features/icons';
import {
  MemberAvatar,
  useMemberMoods,
  type AvatarMood,
} from '@/features/members';
import { useReadOnly } from '@/hooks/use-snapshot-view';
import { restoreFocusIfLost } from '@/lib/focus';
import { plural } from '@/lib/plural';
import { ExpenseDialog } from './ExpenseDialog';
import { ExpenseFilterBar } from './ExpenseFilters';
import { dateLabel, groupByDate, sortExpenses } from './expense-list';
import { tidyQuery, totalDetail, totalLabel } from './filter-text';
import { useExpenseFilters } from './use-expense-filters';

const MIN_MEMBERS = 2;

/**
 * Expenses tab: total, compact list by date, and the create / edit dialog.
 * In the read-only view of a snapshot it is just the total and the list: no
 * "Agregar gasto", rows do not open anything.
 */
export function ExpensesTab() {
  const group = useCurrentGroup();
  const readOnly = useReadOnly();
  const [target, setTarget] = useState<Expense | 'new' | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const canAdd = group.members.length >= MIN_MEMBERS;
  const count = group.expenses.length;
  const hasExpenses = count > 0;
  const filters = useExpenseFilters(group);
  const { filter, query, hasQuery, viewerId } = filters;
  const shown = filters.active
    ? filterExpenses(group, filter, query, viewerId)
    : group.expenses;
  const summary = summarizeExpenses(
    group,
    shown,
    viewerId,
    filter?.kind === 'member' ? filter.memberId : null
  );
  const days = groupByDate(sortExpenses(shown));
  const moods = useMemberMoods(group);

  // Lets the toasts rise above the fixed button on mobile (see index.css).
  useEffect(() => {
    if (!hasExpenses || readOnly) return;
    const root = document.documentElement;
    root.setAttribute('data-floating-action', '');
    return () => root.removeAttribute('data-floating-action');
  }, [hasExpenses, readOnly]);

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      {count > 0 ? (
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-sm text-muted-foreground'>
              {totalLabel(filter, query, group)}
            </p>
            <p className='text-3xl font-bold tracking-tight break-words tabular-nums'>
              {formatAmount(summary.total, group.currency)}
            </p>
            <p className='text-sm break-words text-muted-foreground'>
              {filters.active
                ? totalDetail({
                    summary,
                    groupCount: count,
                    filter,
                    hasQuery,
                    group,
                    viewerId,
                  })
                : plural(count, 'gasto', 'gastos')}
            </p>
          </div>
          {!readOnly && (
            <AddExpenseButton
              ref={addButton}
              enabled={canAdd}
              floating
              onClick={() => setTarget('new')}
            />
          )}
        </div>
      ) : (
        <Card className='items-center gap-3 py-8 text-center'>
          <h2 className='text-lg font-semibold'>Aún no hay gastos</h2>
          {readOnly ? (
            <p className='max-w-xs text-sm text-muted-foreground'>
              Cuando esta captura se tomó, el grupo no tenía gastos.
            </p>
          ) : (
            <>
              <p className='max-w-xs text-sm text-muted-foreground'>
                Un gasto es algo que alguien pagó y que se reparte entre el
                grupo. Anótalo y Dividy calcula quién le debe a quién.
              </p>
              <AddExpenseButton
                ref={addButton}
                enabled={canAdd}
                onClick={() => setTarget('new')}
              />
            </>
          )}
        </Card>
      )}

      {hasExpenses && <ExpenseFilterBar group={group} filters={filters} />}
      {/* Announces how many expenses are left after a filter or search. */}
      <p aria-live='polite' className='sr-only'>
        {hasExpenses && filters.active && !filters.pending
          ? `Mostrando ${summary.count} de ${count} ${count === 1 ? 'gasto' : 'gastos'}`
          : ''}
      </p>

      {!readOnly && !canAdd && <NeedMoreMembers group={group} />}

      {filters.pending && <Skeleton aria-busy='true' className='h-32' />}

      {!filters.pending &&
        hasExpenses &&
        filters.active &&
        shown.length === 0 && (
          <NoResults
            query={hasQuery ? tidyQuery(query) : null}
            onClear={() => {
              filters.clear();
              restoreFocusIfLost();
            }}
          />
        )}

      {!filters.pending &&
        days.map((day) => (
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
                    moods={moods}
                    expense={expense}
                    viewerId={viewerId}
                    onOpen={readOnly ? undefined : () => setTarget(expense)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

      {/* Room so the floating button never covers the last expense. */}
      {count > 0 && !readOnly && (
        <div aria-hidden='true' className='h-16 md:hidden' />
      )}

      {!readOnly && (
        <ExpenseDialog
          group={group}
          target={target}
          onClose={() => {
            setTarget(null);
            // A deleted expense takes its row (the dialog's trigger) with it.
            restoreFocusIfLost(addButton.current);
          }}
        />
      )}
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

function NoResults({
  query,
  onClear,
}: {
  /** The search, if there is one; the message then talks about it. */
  query: string | null;
  onClear: () => void;
}) {
  return (
    <div className='flex flex-col items-center gap-3 py-8 text-center'>
      <p className='max-w-xs text-sm text-muted-foreground'>
        {query !== null
          ? `No hay gastos que coincidan con "${query}".`
          : 'No hay gastos con este filtro.'}
      </p>
      <Button variant='outline' onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}

function NeedMoreMembers({ group }: { group: Group }) {
  return (
    <p
      role='status'
      className='rounded-xl bg-accent p-3 text-sm text-accent-foreground'
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
  moods,
  expense,
  viewerId,
  onOpen,
}: {
  group: Group;
  moods: Map<string, AvatarMood>;
  expense: Expense;
  /** Who "you" are; with it the row says how much of the expense is yours. */
  viewerId: MemberId | null;
  /** Opens the edit dialog; without it (read-only) the row is plain text. */
  onOpen?: () => void;
}) {
  const payer = group.members.find((m) => m.id === expense.payerId);
  const n = expense.split.participantIds.length;
  const everyone = n === group.members.length;
  // A one-person expense is not "divided": it is someone's own ("solo para Carla").
  const onlyFor =
    n === 1 && !everyone
      ? group.members.find((m) => m.id === expense.split.participantIds[0])
      : undefined;
  const division = onlyFor
    ? `solo para ${onlyFor.name}`
    : expense.split.type === 'equal'
      ? `dividido entre ${everyone ? 'todos' : plural(n, 'persona', 'personas')}`
      : `dividido ${splitTypeLabel(expense.split.type)}`;
  const share =
    viewerId === null ? undefined : expenseShareOf(group, expense, viewerId);
  const content = (
    <>
      <EntityIcon text={expense.description} kind='expense' size='list' />
      <span className='flex min-w-0 flex-1 items-start gap-3'>
        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='min-w-0 font-medium break-words'>
            {expense.description}
          </span>
          <span className='flex items-center gap-2 text-sm text-muted-foreground'>
            {payer && (
              <MemberAvatar
                member={payer}
                mood={moods.get(payer.id)}
                className='size-5'
              />
            )}
            <span className='min-w-0 break-words'>
              Pagó {payer?.name ?? 'alguien'} · {division}
            </span>
          </span>
        </span>
        <span className='flex shrink-0 flex-col items-end gap-0.5 text-right'>
          <span className='font-semibold tabular-nums'>
            {formatAmount(expense.amount, group.currency)}
          </span>
          {share !== undefined && (
            <span className='text-xs leading-5 text-muted-foreground tabular-nums'>
              {share === null
                ? 'No participas'
                : `Tu parte ${formatAmount(share, group.currency)}`}
            </span>
          )}
        </span>
      </span>
    </>
  );
  const box =
    'flex w-full items-center gap-3 rounded-tile border bg-card p-2.5 pr-3 text-left shadow-soft';
  if (!onOpen) return <div className={box}>{content}</div>;
  return (
    <button
      type='button'
      onClick={onOpen}
      className={`${box} transition-colors outline-none hover:bg-card/70 focus-visible:ring-[3px] focus-visible:ring-ring/40`}
    >
      {content}
    </button>
  );
}
