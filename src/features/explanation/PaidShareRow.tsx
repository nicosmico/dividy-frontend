import { Popover } from 'radix-ui';
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { BalanceLabel } from '@/components/balance-label';
import { formatAmount } from '@/domain';
import { EntityIcon } from '@/features/icons';
import { MemberAvatar, type AvatarMood } from '@/features/members';
import { cn } from '@/lib/utils';
import type { ExplainedExpense, Slice } from './build-explanation';
import { fillStyle, type ColorMap } from './colors';

/** Room kept at the end of each bar for the total amount. */
export const AMOUNT_ROOM = '5.25rem';

/** Opens the tooltip of one segment at a time; used by the real chart. */
export interface SegmentTooltips {
  expenseById: ReadonlyMap<string, ExplainedExpense>;
  /** Key of the segment whose tooltip is open. */
  active: string | null;
  setActive: (key: string | null) => void;
}

/**
 * How the animation drives a row. Without it the row is the static chart row.
 * Every state keeps the row's size, so nothing jumps between steps.
 */
export interface RowMotion {
  /** Position of the member in the group: staggers the arrival of its pieces. */
  index: number;
  /** `false` until the "Pagó" bar has grown from nothing. */
  paidGrown: boolean;
  /** Expenses being split now: the other "Pagó" segments are dimmed. */
  focus: ReadonlySet<string> | null;
  /** The focused segment, cut into one piece per participant. */
  split: { expenseId: string; amounts: number[] } | null;
  /** Expenses whose segment of "Su parte" is already on screen. */
  shareShown: ReadonlySet<string>;
  /** `false` hides the amount after the "Su parte" bar. */
  shareAmountVisible: boolean;
  /** `false` hides the balance in words. */
  balanceVisible: boolean;
}

export interface BarData {
  slices: Slice[];
  /** Sets the length of the bar. */
  total: number;
  /** The amount written after the bar, if it is not `total` (animation). */
  displayTotal?: number;
}

export interface PaidShareRowProps {
  member: { id: string; name: string };
  mood?: AvatarMood;
  /** `paid - share + paymentsSent - paymentsReceived`. */
  balance: number;
  paid: BarData;
  share: BarData;
  /** The tallest bar of the whole chart: the common scale. */
  scaleMax: number;
  colors: ColorMap;
  /** Segments become buttons with a tooltip (the real chart). */
  tooltips?: SegmentTooltips;
  /** Present only in the animation. */
  motion?: RowMotion;
}

const GROW =
  'transition-[width,opacity] duration-700 ease-out motion-reduce:transition-none';
const FADE = 'transition-opacity duration-300 motion-reduce:transition-none';
const STAGGER_MS = 140;

/**
 * One member of "Pagó vs. su parte": face, name and balance in words, then the
 * "Pagó" and "Su parte" bars split by expense. The Saldos chart and the
 * step-by-step animation both draw this component, so they look the same.
 */
export function PaidShareRow({
  member,
  mood,
  balance,
  paid,
  share,
  scaleMax,
  colors,
  tooltips,
  motion,
}: PaidShareRowProps) {
  return (
    <li data-slot='paid-share-row' className='grid gap-1.5'>
      <div className='flex items-center gap-2'>
        <MemberAvatar
          member={member}
          mood={mood}
          decorative
          className='size-8'
        />
        <span className='min-w-0 flex-1 text-sm font-bold break-words'>
          {member.name}
        </span>
        <BalanceLabel
          balance={balance}
          className={cn(
            'shrink-0 text-right text-[13px]',
            motion &&
              'transition-[opacity,transform] duration-500 motion-reduce:transition-none',
            motion && !motion.balanceVisible && 'translate-y-1 opacity-0'
          )}
        />
      </div>
      <Bar
        rowKey={member.id}
        kind='paid'
        label='Pagó'
        owner={member.name}
        data={paid}
        scaleMax={scaleMax}
        colors={colors}
        tooltips={tooltips}
        motion={
          motion && {
            index: motion.index,
            grown: motion.paidGrown,
            focus: motion.focus,
            split: motion.split,
            shown: null,
            amountVisible: motion.paidGrown,
          }
        }
      />
      <Bar
        rowKey={member.id}
        kind='share'
        label='Su parte'
        owner={member.name}
        data={share}
        scaleMax={scaleMax}
        colors={colors}
        tooltips={tooltips}
        motion={
          motion && {
            index: motion.index,
            grown: true,
            focus: null,
            split: null,
            shown: motion.shareShown,
            amountVisible: motion.shareAmountVisible,
          }
        }
      />
    </li>
  );
}

interface BarProps {
  rowKey: string;
  kind: 'paid' | 'share';
  label: string;
  owner: string;
  data: BarData;
  scaleMax: number;
  colors: ColorMap;
  tooltips?: SegmentTooltips;
  motion?: BarMotion;
}

interface BarMotion {
  index: number;
  grown: boolean;
  focus: ReadonlySet<string> | null;
  split: { expenseId: string; amounts: number[] } | null;
  /** Segments on screen; `null` shows them all. */
  shown: ReadonlySet<string> | null;
  /** Whether the amount after the bar is on screen. */
  amountVisible: boolean;
}

/**
 * One bar. In the chart its segments are buttons (a single tab stop; arrows
 * move between them) that open a tooltip with the expense's icon, name and
 * amount. In the animation they are plain boxes that fade in one by one.
 */
function Bar({
  rowKey,
  kind,
  label,
  owner,
  data,
  scaleMax,
  colors,
  tooltips,
  motion,
}: BarProps) {
  const [tabStop, setTabStop] = useState(0);
  const group = useRef<HTMLDivElement>(null);
  const { slices, total } = data;
  const ratio = scaleMax > 0 ? total / scaleMax : 0;
  // In the animation "Pagó" grows from nothing; "Su parte" keeps its final
  // width and its segments appear in it.
  const widthRatio = motion && !motion.grown ? 0 : ratio;
  const barStyle: CSSProperties = {
    width: `calc(${widthRatio} * (100% - ${AMOUNT_ROOM}))`,
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

  const segments = slices.map((slice, index) => {
    const color = colors.get(slice.expenseId);
    if (!color) return null;
    const key = `${rowKey}:${kind}:${slice.expenseId}`;
    const pieces =
      motion?.split?.expenseId === slice.expenseId
        ? motion.split.amounts
        : null;
    const swatch = pieces ? (
      <span
        data-slot='pieces'
        className='flex h-3.5 w-full gap-[2px] bg-card transition-[gap] duration-500 motion-reduce:transition-none starting:gap-0'
      >
        {pieces.map((amount, i) => (
          <span
            key={i}
            className='block h-3.5 min-w-px rounded-[3px] ring-1 ring-foreground/15 ring-inset'
            style={{ ...fillStyle(color), flex: `${amount} 1 0%` }}
          />
        ))}
      </span>
    ) : (
      <span
        className='block h-3.5 w-full rounded-[4px] ring-1 ring-foreground/15 ring-inset'
        style={fillStyle(color)}
      />
    );
    const shown = !motion?.shown || motion.shown.has(slice.expenseId);
    const dimmed = !!motion?.focus && !motion.focus.has(slice.expenseId);
    const expense = tooltips?.expenseById.get(slice.expenseId);
    if (tooltips && expense) {
      return (
        <Segment
          key={key}
          expense={expense}
          amount={slice.amount}
          swatch={swatch}
          open={tooltips.active === key}
          tabStop={index === tabStop}
          onOpen={() => tooltips.setActive(key)}
          onClose={() =>
            tooltips.setActive(tooltips.active === key ? null : tooltips.active)
          }
          onFocusSegment={() => setTabStop(index)}
        />
      );
    }
    return (
      <span
        key={key}
        data-slot='segment'
        className={cn(
          'flex min-w-1 items-center rounded-[5px]',
          motion &&
            'transition-[opacity,transform] duration-500 motion-reduce:transition-none'
        )}
        style={{
          flex: `${slice.amount} 1 0%`,
          ...(motion && {
            opacity: !shown ? 0 : dimmed ? 0.3 : 1,
            transform: shown ? 'none' : 'translateY(-0.5rem)',
            transitionDelay:
              kind === 'share' && shown
                ? `${250 + motion.index * STAGGER_MS}ms`
                : '0ms',
          }),
        }}
      >
        {swatch}
      </span>
    );
  });

  return (
    <div className='flex items-center gap-2'>
      <span className='w-14 shrink-0 text-[11px] text-muted-foreground'>
        {label}
      </span>
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2',
          motion && 'relative'
        )}
      >
        {motion && (
          <span
            aria-hidden='true'
            data-slot='track'
            className='absolute inset-y-0 left-0 my-auto h-3.5 rounded-[4px] bg-muted'
            style={{ width: `calc(100% - ${AMOUNT_ROOM})` }}
          />
        )}
        {slices.length > 0 && (
          <div
            ref={group}
            data-slot='bar'
            role={tooltips ? 'group' : undefined}
            aria-label={
              tooltips
                ? `${label} de ${owner}: ${formatAmount(total)}`
                : undefined
            }
            className={cn(
              'flex h-6 gap-[2px]',
              motion && ['relative', GROW, 'overflow-hidden']
            )}
            style={{
              ...barStyle,
            }}
            onKeyDown={tooltips ? onKeyDown : undefined}
          >
            {segments}
          </div>
        )}
        <span
          data-slot='amount'
          className={cn(
            'text-xs font-semibold whitespace-nowrap tabular-nums',
            (data.displayTotal ?? total) === 0 && 'text-muted-foreground',
            motion && ['relative', FADE]
          )}
          style={
            motion
              ? {
                  opacity: motion.amountVisible ? 1 : 0,
                  transitionDelay: motion.amountVisible ? '300ms' : '0ms',
                }
              : undefined
          }
        >
          {formatAmount(data.displayTotal ?? total)}
        </span>
      </div>
    </div>
  );
}

function Segment({
  expense,
  amount,
  swatch,
  open,
  tabStop,
  onOpen,
  onClose,
  onFocusSegment,
}: {
  expense: ExplainedExpense;
  amount: number;
  swatch: React.ReactNode;
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
          {swatch}
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
