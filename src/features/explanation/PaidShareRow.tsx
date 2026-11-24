import { Popover } from 'radix-ui';
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { BalanceLabel } from '@/components/balance-label';
import { ViewerName } from '@/components/viewer-name';
import { formatAmount, type Member } from '@/domain';
import { EntityIcon } from '@/features/icons';
import { MemberAvatar, type AvatarMood } from '@/features/members';
import { useElementWidth } from '@/hooks/use-element-width';
import { cn } from '@/lib/utils';
import type { ExplainedExpense, Slice } from './build-explanation';
import { fillStyle, type ColorMap } from './colors';
import { computeCuts, describeDivision } from './cuts';

/** Room kept at the end of each bar for the total amount. */
const AMOUNT_ROOM_REM = 5.25;
export const AMOUNT_ROOM = `${AMOUNT_ROOM_REM}rem`;
/** Gap between the segments of a bar (`gap-[2px]`). */
const SEGMENT_GAP_PX = 2;

/** Opens the tooltip of one segment at a time; used by the real chart. */
export interface SegmentTooltips {
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
  /** `false` until the "Gastó" bar has grown from nothing. */
  paidGrown: boolean;
  /** Expenses being split now: the other "Gastó" segments are dimmed. */
  focus: ReadonlySet<string> | null;
  /**
   * Expenses already split (step 2 on): their "Gastó" segment is cut into one
   * part per participant and their segment of "Su parte" is on screen.
   */
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
  member: Pick<Member, 'id' | 'name' | 'avatar'>;
  mood?: AvatarMood;
  /** Writes "(tú)" next to the name (the Saldos chart; the animation never does). */
  isViewer?: boolean;
  /** `paid - share + paymentsSent - paymentsReceived`. */
  balance: number;
  paid: BarData;
  share: BarData;
  /** The tallest bar of the whole chart: the common scale. */
  scaleMax: number;
  colors: ColorMap;
  /** Every expense by id: "Gastó" segments are cut into one part per participant. */
  expenseById: ReadonlyMap<string, ExplainedExpense>;
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
 * One member of "Gastó vs. su parte": face, name and balance in words, then
 * the "Gastó" and "Su parte" bars split by expense. In "Gastó" every expense
 * is also cut into one part per participant (when the parts are wide enough).
 * The Saldos chart and the step-by-step animation both draw this component,
 * so they look the same.
 */
export function PaidShareRow({
  member,
  mood,
  isViewer = false,
  balance,
  paid,
  share,
  scaleMax,
  colors,
  expenseById,
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
          <ViewerName name={member.name} isViewer={isViewer} />
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
        label='Gastó'
        owner={member.name}
        data={paid}
        scaleMax={scaleMax}
        colors={colors}
        expenseById={expenseById}
        tooltips={tooltips}
        motion={
          motion && {
            index: motion.index,
            grown: motion.paidGrown,
            focus: motion.focus,
            shown: null,
            cutShown: motion.shareShown,
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
        expenseById={expenseById}
        tooltips={tooltips}
        motion={
          motion && {
            index: motion.index,
            grown: true,
            focus: null,
            shown: motion.shareShown,
            cutShown: null,
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
  expenseById: ReadonlyMap<string, ExplainedExpense>;
  tooltips?: SegmentTooltips;
  motion?: BarMotion;
}

interface BarMotion {
  index: number;
  grown: boolean;
  focus: ReadonlySet<string> | null;
  /** Segments on screen; `null` shows them all. */
  shown: ReadonlySet<string> | null;
  /** Segments that are cut into parts (only "Gastó"); `null` cuts every one. */
  cutShown: ReadonlySet<string> | null;
  /** Whether the amount after the bar is on screen. */
  amountVisible: boolean;
}

/**
 * One bar. In the chart its segments are buttons (a single tab stop; arrows
 * move between them) that open a tooltip with the expense's icon, name and
 * amount (and, in "Gastó", how it is divided). In the animation they are
 * plain boxes that fade in one by one.
 */
function Bar({
  rowKey,
  kind,
  label,
  owner,
  data,
  scaleMax,
  colors,
  expenseById,
  tooltips,
  motion,
}: BarProps) {
  const [tabStop, setTabStop] = useState(0);
  const group = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const areaPx = useElementWidth(area);
  const { slices, total } = data;
  const ratio = scaleMax > 0 ? total / scaleMax : 0;
  // Final width of the bar in px (not the animated one, so the cuts do not
  // pop in while it grows). Unknown (0): assume there is room.
  const rootPx =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const barPx =
    areaPx > 0
      ? ratio * Math.max(0, areaPx - AMOUNT_ROOM_REM * rootPx)
      : Number.POSITIVE_INFINITY;
  const gapsPx = SEGMENT_GAP_PX * Math.max(0, slices.length - 1);
  // In the animation "Gastó" grows from nothing; "Su parte" keeps its final
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
    const expense = expenseById.get(slice.expenseId);
    // Only a segment that is the whole expense is cut by its participants
    // (not the welcome example's last step, where "Gastó" shows shares).
    const cuttable =
      kind === 'paid' &&
      !!expense &&
      slice.amount === expense.amount &&
      (!motion?.cutShown || motion.cutShown.has(slice.expenseId));
    const cuts =
      cuttable && total > 0
        ? computeCuts(
            expense,
            Math.max(0, barPx - gapsPx) * (slice.amount / total)
          )
        : [];
    const swatch = (
      <span
        className='relative block h-3.5 w-full rounded-[4px] ring-1 ring-foreground/15 ring-inset'
        style={fillStyle(color)}
      >
        {cuts.length > 0 && (
          <span
            aria-hidden='true'
            data-slot='cuts'
            className='pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]'
          >
            {cuts.map((position, i) => (
              <span
                key={i}
                data-slot='cut'
                className='absolute inset-y-0 w-[2px] -translate-x-1/2 bg-card transition-[opacity,transform] duration-500 motion-reduce:transition-none starting:scale-y-0 starting:opacity-0'
                style={{ left: `${position * 100}%` }}
              />
            ))}
          </span>
        )}
      </span>
    );
    const shown = !motion?.shown || motion.shown.has(slice.expenseId);
    const dimmed = !!motion?.focus && !motion.focus.has(slice.expenseId);
    if (tooltips && expense) {
      return (
        <Segment
          key={key}
          expense={expense}
          amount={slice.amount}
          division={
            kind === 'paid' && cuttable ? describeDivision(expense) : null
          }
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
        ref={area}
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
  division,
  swatch,
  open,
  tabStop,
  onOpen,
  onClose,
  onFocusSegment,
}: {
  expense: ExplainedExpense;
  amount: number;
  /** How the expense is divided ("entre 5: $30.000 c/u"), in "Gastó" only. */
  division: string | null;
  swatch: React.ReactNode;
  open: boolean;
  tabStop: boolean;
  onOpen: () => void;
  onClose: () => void;
  onFocusSegment: () => void;
}) {
  const name = `${expense.description}: ${formatAmount(amount)}${division ? ` · ${division}` : ''}`;
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
            <span className='block [overflow-wrap:anywhere] tabular-nums'>
              {formatAmount(amount)}
              {division && ` · ${division}`}
            </span>
          </span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
