import { Play } from 'lucide-react';
import { Popover } from 'radix-ui';
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatAmount, type Group } from '@/domain';
import {
  buildExplanation,
  buildLegend,
  fillStyle,
  type Explanation,
  type ExplainedExpense,
  type Slice,
} from '@/features/explanation';
import { EntityIcon } from '@/features/icons';
import { MemberAvatar, useMemberMoods } from '@/features/members';
import { cn } from '@/lib/utils';
import { BalanceLabel } from './MemberBalances';

/** Room kept at the end of each bar for the total amount. */
const AMOUNT_ROOM = '5.25rem';

interface PaidVsShareChartProps {
  group: Group;
  /** Opens the step-by-step explanation. */
  onExplain: () => void;
}

/**
 * "Pagó vs. su parte" (decision 92): two horizontal bars per member split by
 * expense, on one common scale, with a legend, tooltips on the segments and an
 * equivalent table. Everything comes from `buildExplanation`.
 */
export function PaidVsShareChart({ group, onExplain }: PaidVsShareChartProps) {
  const explanation = useMemo(() => buildExplanation(group), [group]);
  const moods = useMemberMoods(group);
  // Key of the segment whose tooltip is open: one at a time.
  const [active, setActive] = useState<string | null>(null);
  const expenseById = useMemo(
    () => new Map(explanation.expenses.map((e) => [e.id, e])),
    [explanation]
  );

  return (
    <section aria-labelledby='chart-heading'>
      <Card className='gap-4 rounded-card p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 id='chart-heading' className='text-base font-bold'>
            Pagó vs. su parte
          </h2>
          <Button variant='accent' size='sm' onClick={onExplain}>
            <Play aria-hidden='true' className='fill-current' />
            Ver cómo se calculó
          </Button>
        </div>

        <ul className='grid gap-4'>
          {explanation.members.map((m) => (
            <li key={m.member.id} className='grid gap-1.5'>
              <div className='flex items-center gap-2'>
                <MemberAvatar
                  member={m.member}
                  mood={moods.get(m.member.id)}
                  decorative
                  className='size-8'
                />
                <span className='min-w-0 flex-1 text-sm font-bold break-words'>
                  {m.member.name}
                </span>
                <BalanceLabel
                  balance={m.balance}
                  className='shrink-0 text-right text-[13px]'
                />
              </div>
              <ChartBar
                rowKey={m.member.id}
                kind='paid'
                label='Pagó'
                owner={m.member.name}
                slices={m.paidSlices}
                total={m.paid}
                scaleMax={explanation.scaleMax}
                expenseById={expenseById}
                active={active}
                setActive={setActive}
              />
              <ChartBar
                rowKey={m.member.id}
                kind='share'
                label='Su parte'
                owner={m.member.name}
                slices={m.shareSlices}
                total={m.share}
                scaleMax={explanation.scaleMax}
                expenseById={expenseById}
                active={active}
                setActive={setActive}
              />
            </li>
          ))}
        </ul>

        <Legend explanation={explanation} />
        <TableAlternative group={group} explanation={explanation} />
      </Card>
    </section>
  );
}

interface ChartBarProps {
  rowKey: string;
  kind: 'paid' | 'share';
  label: string;
  owner: string;
  slices: Slice[];
  total: number;
  scaleMax: number;
  expenseById: Map<string, ExplainedExpense>;
  active: string | null;
  setActive: (key: string | null) => void;
}

/**
 * One bar. Its segments are buttons (a single tab stop; arrows move between
 * them) that open a tooltip with the expense's icon, name and amount.
 */
function ChartBar({
  rowKey,
  kind,
  label,
  owner,
  slices,
  total,
  scaleMax,
  expenseById,
  active,
  setActive,
}: ChartBarProps) {
  const [tabStop, setTabStop] = useState(0);
  const group = useRef<HTMLDivElement>(null);
  const ratio = scaleMax > 0 ? total / scaleMax : 0;
  const barStyle: CSSProperties = {
    width: `calc(${ratio} * (100% - ${AMOUNT_ROOM}))`,
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [
      ...(group.current?.querySelectorAll<HTMLButtonElement>('button') ?? []),
    ];
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement
    );
    if (current === -1) return;
    const target =
      event.key === 'ArrowRight'
        ? Math.min(current + 1, buttons.length - 1)
        : event.key === 'ArrowLeft'
          ? Math.max(current - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : -1;
    if (target === -1) return;
    event.preventDefault();
    buttons[target].focus();
  };

  return (
    <div className='flex items-center gap-2'>
      <span className='w-14 shrink-0 text-[11px] text-muted-foreground'>
        {label}
      </span>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        {slices.length > 0 && (
          <div
            ref={group}
            role='group'
            aria-label={`${label} de ${owner}: ${formatAmount(total)}`}
            className='flex h-6 gap-[2px]'
            style={barStyle}
            onKeyDown={onKeyDown}
          >
            {slices.map((slice, index) => {
              const expense = expenseById.get(slice.expenseId);
              if (!expense) return null;
              const key = `${rowKey}:${kind}:${slice.expenseId}`;
              return (
                <Segment
                  key={key}
                  expense={expense}
                  amount={slice.amount}
                  open={active === key}
                  tabStop={index === tabStop}
                  onOpen={() => setActive(key)}
                  onClose={() => setActive(active === key ? null : active)}
                  onFocusSegment={() => setTabStop(index)}
                />
              );
            })}
          </div>
        )}
        <span
          className={cn(
            'text-xs font-semibold whitespace-nowrap tabular-nums',
            total === 0 && 'text-muted-foreground'
          )}
        >
          {formatAmount(total)}
        </span>
      </div>
    </div>
  );
}

function Segment({
  expense,
  amount,
  open,
  tabStop,
  onOpen,
  onClose,
  onFocusSegment,
}: {
  expense: ExplainedExpense;
  amount: number;
  open: boolean;
  tabStop: boolean;
  onOpen: () => void;
  onClose: () => void;
  onFocusSegment: () => void;
}) {
  const name = `${expense.description}: ${formatAmount(amount)}`;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => (next ? onOpen() : onClose())}
    >
      <Popover.Trigger asChild>
        <button
          type='button'
          aria-label={name}
          tabIndex={tabStop ? 0 : -1}
          data-slot='segment'
          className='flex min-w-1 items-center rounded-[5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring'
          style={{ flex: `${amount} 1 0%` }}
          onFocus={() => {
            onFocusSegment();
            onOpen();
          }}
          onBlur={onClose}
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          onClick={(event) => {
            // Open and stay open: Radix would toggle, closing what hover or focus just opened.
            event.preventDefault();
            onOpen();
          }}
        >
          <span
            className='block h-3.5 w-full rounded-[4px] ring-1 ring-foreground/15 ring-inset'
            style={fillStyle(expense.color)}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side='top'
          sideOffset={6}
          collisionPadding={12}
          aria-label={name}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className='z-50 flex max-w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2 rounded-tile border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-pop outline-none'
        >
          <EntityIcon text={expense.description} kind='expense' size='legend' />
          <span className='min-w-0'>
            <span className='block font-semibold break-words'>
              {expense.description}
            </span>
            <span className='block tabular-nums'>{formatAmount(amount)}</span>
          </span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Legend({ explanation }: { explanation: Explanation }) {
  const entries = buildLegend(explanation);
  return (
    <ul
      aria-label='Leyenda de gastos'
      className='grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-3'
    >
      {entries.map((entry) => (
        <li key={entry.key} className='flex min-w-0 items-center gap-2'>
          <EntityIcon
            text={entry.expense?.description ?? ''}
            kind='expense'
            size='legend'
          />
          <span
            aria-hidden='true'
            className='h-3 w-4 shrink-0 rounded-[3px] ring-1 ring-foreground/15 ring-inset'
            style={fillStyle(entry.color)}
          />
          <span className='min-w-0 text-xs leading-tight'>
            <span className='block font-semibold break-words'>
              {entry.label}
            </span>
            <span className='block text-muted-foreground tabular-nums'>
              {formatAmount(entry.total)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The same numbers as the chart, as tables (one per member). */
function TableAlternative({
  group,
  explanation,
}: {
  group: Group;
  explanation: Explanation;
}) {
  return (
    <details className='group/table border-t pt-3 text-sm'>
      <summary className='flex min-h-11 cursor-pointer items-center rounded-lg font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40'>
        Ver como tabla
      </summary>
      <div className='grid gap-4 pt-2'>
        {explanation.members.map((m) => {
          const rows = explanation.expenses
            .map((expense) => ({
              expense,
              paid:
                m.paidSlices.find((s) => s.expenseId === expense.id)?.amount ??
                0,
              share:
                m.shareSlices.find((s) => s.expenseId === expense.id)?.amount ??
                0,
            }))
            .filter((row) => row.paid > 0 || row.share > 0);
          return (
            <table key={m.member.id} className='w-full text-left'>
              <caption className='pb-1 text-left font-semibold'>
                {m.member.name} · <BalanceLabel balance={m.balance} />
              </caption>
              <thead className='text-xs text-muted-foreground'>
                <tr>
                  <th scope='col' className='py-1 pr-2 font-medium'>
                    Gasto
                  </th>
                  <th scope='col' className='py-1 text-right font-medium'>
                    Pagó
                  </th>
                  <th scope='col' className='py-1 pl-2 text-right font-medium'>
                    Su parte
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ expense, paid, share }) => (
                  <tr key={expense.id} className='border-t'>
                    <th
                      scope='row'
                      className='py-1 pr-2 font-normal break-words'
                    >
                      {expense.description}
                    </th>
                    <td className='py-1 text-right tabular-nums'>
                      {formatAmount(paid)}
                    </td>
                    <td className='py-1 pl-2 text-right tabular-nums'>
                      {formatAmount(share)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t font-semibold'>
                  <th scope='row' className='py-1 pr-2 text-left'>
                    Total
                  </th>
                  <td className='py-1 text-right tabular-nums'>
                    {formatAmount(m.paid)}
                  </td>
                  <td className='py-1 pl-2 text-right tabular-nums'>
                    {formatAmount(m.share)}
                  </td>
                </tr>
              </tfoot>
            </table>
          );
        })}
        {group.payments.length > 0 && (
          <p className='text-muted-foreground'>
            Los saldos incluyen los pagos ya registrados.
          </p>
        )}
      </div>
    </details>
  );
}
