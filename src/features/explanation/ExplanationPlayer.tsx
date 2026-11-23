import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';

import { Button } from '@/components/ui/button';
import { computeMemberMoods, MemberAvatar } from '@/features/members';
import { formatAmount, type Group } from '@/domain';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  buildExplanation,
  buildLegend,
  type Explanation,
  type MemberExplanation,
  type Slice,
} from './build-explanation';
import { fillStyle, type ColorMap } from './colors';
import { settleGroup } from './example-group';
import { narrate, STEP_COUNT, STEP_TITLES } from './narration';

/** With up to this many members the bars are vertical columns. */
export const MAX_COLUMN_MEMBERS = 4;
const STEP_MS = 4000;

interface ExplanationPlayerProps {
  group: Group;
  /** Accessible name of the animation. */
  label: string;
  /**
   * The welcome example: the last step shows the suggested transfers already
   * paid (in memory), so every balance is zero and every face is happy.
   * Without it the last step shows the group as it really is.
   */
  settleAtEnd?: boolean;
  className?: string;
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** `false` while the browser tab is hidden. */
function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true
  );
}

/**
 * The four-step animation of how Dividy computes who owes whom (decision 90),
 * drawn from the real domain: `buildExplanation` for the bars and
 * `computeMemberMoods` for the faces. Vertical columns for up to 4 members,
 * horizontal rows beyond that. CSS transitions only; with reduced motion there
 * is no autoplay and no transition, just the previous / next buttons.
 */
export function ExplanationPlayer({
  group,
  label,
  settleAtEnd = false,
  className,
}: ExplanationPlayerProps) {
  const before = useMemo(() => buildExplanation(group), [group]);
  const settled = useMemo(
    () => (settleAtEnd ? settleGroup(group) : group),
    [group, settleAtEnd]
  );
  const after = useMemo(
    () => (settleAtEnd ? buildExplanation(settled) : before),
    [settleAtEnd, settled, before]
  );
  const moodsBefore = useMemo(() => computeMemberMoods(group), [group]);
  const moodsAfter = useMemo(() => computeMemberMoods(settled), [settled]);

  const reducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
    false
  );
  const visible = usePageVisible();
  const [step, setStep] = useState(0);
  const [wantsPlay, setWantsPlay] = useState(true);
  const playing = wantsPlay && !reducedMotion;

  // One timer per step: moving by hand restarts the count. It does not run
  // while the tab is hidden.
  useEffect(() => {
    if (!playing || !visible) return;
    const id = window.setTimeout(
      () => setStep((current) => (current + 1) % STEP_COUNT),
      STEP_MS
    );
    return () => window.clearTimeout(id);
  }, [playing, visible, step]);

  const go = (target: number) => setStep((target + STEP_COUNT) % STEP_COUNT);
  const last = step === STEP_COUNT - 1;
  const moods = last ? moodsAfter : moodsBefore;
  const scaleMax = Math.max(before.scaleMax, after.scaleMax, 1);
  const columns = group.members.length <= MAX_COLUMN_MEMBERS;
  const titleId = useId();

  return (
    <section
      aria-label={label}
      className={cn('grid gap-3', className)}
      data-step={step}
    >
      <div className='flex items-center justify-between gap-2'>
        <span
          id={titleId}
          className='text-xs font-bold tracking-wide text-muted-foreground uppercase'
        >
          {step + 1} · {STEP_TITLES[step]}
        </span>
        <div className='flex gap-1.5' aria-hidden='true'>
          {STEP_TITLES.map((title, index) => (
            <span
              key={title}
              className={cn(
                'h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none',
                index === step ? 'w-[18px] bg-primary' : 'w-1.5 bg-border'
              )}
            />
          ))}
        </div>
      </div>

      <div aria-hidden='true'>
        {columns ? (
          <Columns
            step={step}
            before={before}
            after={after}
            moods={moods}
            scaleMax={scaleMax}
          />
        ) : (
          <Rows
            step={step}
            before={before}
            after={after}
            moods={moods}
            scaleMax={scaleMax}
          />
        )}
      </div>

      <Footer step={step} before={before} />

      <p
        aria-live='polite'
        aria-atomic='true'
        className='min-h-[4.5rem] text-[0.9375rem] leading-relaxed'
      >
        <span className='sr-only'>
          Paso {step + 1} de {STEP_COUNT}: {STEP_TITLES[step]}.{' '}
        </span>
        {narrate(before, step, settleAtEnd)}
      </p>

      <div className='flex items-center justify-center gap-2'>
        <Button
          variant='outline'
          size='icon'
          aria-label='Paso anterior'
          onClick={() => go(step - 1)}
        >
          <ChevronLeft className='size-5' aria-hidden='true' />
        </Button>
        {!reducedMotion && (
          <Button
            variant='outline'
            onClick={() => setWantsPlay((value) => !value)}
          >
            {playing ? (
              <Pause aria-hidden='true' />
            ) : (
              <Play aria-hidden='true' />
            )}
            {playing ? 'Pausar' : 'Reproducir'}
          </Button>
        )}
        <Button
          variant='outline'
          size='icon'
          aria-label='Paso siguiente'
          onClick={() => go(step + 1)}
        >
          <ChevronRight className='size-5' aria-hidden='true' />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const TRANSITION =
  'transition-[height,width,opacity] duration-700 ease-out motion-reduce:transition-none';

/** What each bar and tag shows at each step (mirrors the approved mockup). */
function stepState(
  step: number,
  member: MemberExplanation,
  after: MemberExplanation
) {
  const settled = after.balance === 0;
  // Last step: someone who paid exactly their share shows the share's pieces.
  const paidSlices =
    step === 3 && settled ? after.shareSlices : member.paidSlices;
  const paidTotal = step === 3 && settled ? after.share : member.paid;
  return {
    paidSlices,
    paidTotal,
    paidOpacity: step === 1 ? 0.45 : 1,
    paidLabelVisible: step !== 1,
    shareVisible: step >= 1,
    tag: tagFor(step, step === 3 ? after.balance : member.balance),
  };
}

type Tone = 'positive' | 'negative' | 'ok';

function tagFor(
  step: number,
  balance: number
): { top: string; amount: string; tone: Tone } | null {
  if (step < 2) return null;
  if (balance === 0) return { top: 'Saldo', amount: 'Al día', tone: 'ok' };
  return balance > 0
    ? { top: 'Le deben', amount: formatAmount(balance), tone: 'positive' }
    : { top: 'Debe', amount: formatAmount(-balance), tone: 'negative' };
}

const TONES: Record<Tone, string> = {
  positive: 'border border-positive/40 bg-card text-positive',
  negative: 'border border-negative/40 bg-card text-negative',
  ok: 'border border-transparent bg-accent text-accent-foreground',
};

/** Balance tag; two lines in a column, one line in a row. */
function Tag({
  tag,
  inline,
}: {
  tag: ReturnType<typeof tagFor>;
  inline?: boolean;
}) {
  return (
    <span
      data-slot='balance-tag'
      className={cn(
        'inline-flex max-w-full flex-col items-center justify-center rounded-xl px-2.5 py-1 leading-tight transition-[opacity,transform] duration-500 motion-reduce:transition-none',
        inline ? 'min-h-8 flex-row gap-1.5 whitespace-nowrap' : 'min-h-10',
        tag ? TONES[tag.tone] : 'translate-y-1.5 opacity-0'
      )}
    >
      <span className='text-[11px] font-semibold whitespace-nowrap'>
        {tag?.top ?? '·'}
      </span>
      <span className='text-[13px] font-extrabold whitespace-nowrap tabular-nums'>
        {tag?.amount ?? '·'}
      </span>
    </span>
  );
}

function SliceFill({
  slices,
  colors,
  vertical,
}: {
  slices: Slice[];
  colors: ColorMap;
  vertical: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-full w-full gap-[2px] overflow-hidden',
        vertical ? 'flex-col-reverse' : 'flex-row'
      )}
    >
      {slices.map((slice) => {
        const color = colors.get(slice.expenseId);
        return (
          <span
            key={slice.expenseId}
            data-slot='slice'
            className='min-h-[3px] min-w-[3px] rounded-[3px] ring-1 ring-foreground/15 ring-inset'
            style={{
              flex: `${slice.amount} 1 0%`,
              ...(color ? fillStyle(color) : undefined),
            }}
          />
        );
      })}
    </div>
  );
}

interface LayoutProps {
  step: number;
  before: Explanation;
  after: Explanation;
  moods: ReturnType<typeof computeMemberMoods>;
  scaleMax: number;
}

function Columns({ step, before, after, moods, scaleMax }: LayoutProps) {
  const compact = before.members.length > 3;
  const barWidth = compact ? 'w-7' : 'w-9';
  return (
    <ul
      className='grid items-start gap-2'
      style={{
        gridTemplateColumns: `repeat(${before.members.length}, minmax(0, 1fr))`,
      }}
    >
      {before.members.map((m, index) => {
        const s = stepState(step, m, after.members[index]);
        const paidRatio = s.paidTotal / scaleMax;
        const shareRatio = s.shareVisible ? m.share / scaleMax : 0;
        return (
          <li
            key={m.member.id}
            className='flex min-w-0 flex-col items-center gap-1.5'
          >
            <Tag tag={s.tag} />
            <div className='flex h-40 w-full items-end justify-center gap-1.5'>
              <div
                className={cn(
                  barWidth,
                  TRANSITION,
                  'overflow-hidden rounded-t-lg'
                )}
                style={bar('height', paidRatio, s.paidOpacity)}
              >
                <SliceFill
                  slices={s.paidSlices}
                  colors={before.colors}
                  vertical
                />
              </div>
              <div
                className={cn(
                  barWidth,
                  TRANSITION,
                  'overflow-hidden rounded-t-lg'
                )}
                style={bar('height', shareRatio, s.shareVisible ? 1 : 0)}
              >
                <SliceFill
                  slices={m.shareSlices}
                  colors={before.colors}
                  vertical
                />
              </div>
            </div>
            <div className='flex w-full gap-1.5 text-[10px] leading-tight font-semibold text-muted-foreground'>
              <span className='flex-1 text-center'>Pagó</span>
              <span className='flex-1 text-center'>Su parte</span>
            </div>
            <div className='grid w-full gap-0.5 text-[11px] font-bold tabular-nums'>
              <span
                className={cn(
                  'text-left transition-opacity duration-300 motion-reduce:transition-none',
                  !s.paidLabelVisible && 'opacity-0'
                )}
              >
                {formatAmount(s.paidTotal)}
              </span>
              <span
                className={cn(
                  'text-right transition-opacity duration-300 motion-reduce:transition-none',
                  !s.shareVisible && 'opacity-0'
                )}
              >
                {formatAmount(m.share)}
              </span>
            </div>
            <MemberAvatar
              member={m.member}
              mood={moods.get(m.member.id)}
              decorative
              className='size-9'
            />
            <span className='max-w-full text-center text-sm font-semibold break-words'>
              {m.member.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Height or width of a bar as a fraction of the plot (a CSS calc so it can transition). */
function bar(
  axis: 'height' | 'width',
  ratio: number,
  opacity: number
): CSSProperties {
  const full = axis === 'height' ? '10rem' : '(100% - 5.25rem)';
  return { [axis]: `calc(${ratio} * ${full})`, opacity };
}

function Rows({ step, before, after, moods, scaleMax }: LayoutProps) {
  return (
    <ul className='grid gap-3'>
      {before.members.map((m, index) => {
        const s = stepState(step, m, after.members[index]);
        return (
          <li key={m.member.id} className='grid gap-1.5'>
            <div className='flex items-center gap-2'>
              <MemberAvatar
                member={m.member}
                mood={moods.get(m.member.id)}
                decorative
                className='size-8'
              />
              <span className='min-w-0 flex-1 text-sm font-semibold break-words'>
                {m.member.name}
              </span>
              <Tag tag={s.tag} inline />
            </div>
            <BarRow
              label='Pagó'
              slices={s.paidSlices}
              total={s.paidTotal}
              colors={before.colors}
              ratio={s.paidTotal / scaleMax}
              opacity={s.paidOpacity}
              showAmount={s.paidLabelVisible}
            />
            <BarRow
              label='Su parte'
              slices={m.shareSlices}
              total={m.share}
              colors={before.colors}
              ratio={s.shareVisible ? m.share / scaleMax : 0}
              opacity={s.shareVisible ? 1 : 0}
              showAmount={s.shareVisible}
            />
          </li>
        );
      })}
    </ul>
  );
}

function BarRow({
  label,
  slices,
  total,
  colors,
  ratio,
  opacity,
  showAmount,
}: {
  label: string;
  slices: Slice[];
  total: number;
  colors: ColorMap;
  ratio: number;
  opacity: number;
  showAmount: boolean;
}) {
  return (
    <div className='flex items-center gap-2'>
      <span className='w-14 shrink-0 text-[11px] text-muted-foreground'>
        {label}
      </span>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <div
          className={cn('h-3.5 overflow-hidden rounded-[4px]', TRANSITION)}
          style={bar('width', ratio, opacity)}
        >
          <SliceFill slices={slices} colors={colors} vertical={false} />
        </div>
        <span
          className={cn(
            'text-xs font-semibold whitespace-nowrap tabular-nums transition-opacity duration-300 motion-reduce:transition-none',
            !showAmount && 'opacity-0'
          )}
        >
          {formatAmount(total)}
        </span>
      </div>
    </div>
  );
}

/**
 * Below the plot: the color legend in steps 1 to 3 and, in the last one, the
 * payments already made and the transfers that are still missing. Both live in
 * the same grid cell so the card never changes height.
 */
function Footer({ step, before }: { step: number; before: Explanation }) {
  const last = step === STEP_COUNT - 1;
  const legend = buildLegend(before);
  const nameOf = (id: string) =>
    before.members.find((m) => m.member.id === id)?.member.name ?? 'alguien';
  return (
    <div className='grid [&>*]:col-start-1 [&>*]:row-start-1'>
      <ul
        aria-hidden={last}
        className={cn(
          'flex flex-wrap content-start justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none',
          last && 'invisible opacity-0'
        )}
      >
        {legend.map((entry) => (
          <li key={entry.key} className='inline-flex items-center gap-1.5'>
            <span
              aria-hidden='true'
              className='h-2.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-foreground/15 ring-inset'
              style={fillStyle(entry.color)}
            />
            {entry.label}
          </li>
        ))}
      </ul>
      <div
        aria-hidden={!last}
        className={cn(
          'grid content-start gap-1.5 transition-opacity duration-500 motion-reduce:transition-none',
          !last && 'invisible opacity-0'
        )}
      >
        {before.payments.length > 0 && (
          <p className='text-xs font-semibold text-muted-foreground'>
            Pagos ya registrados
          </p>
        )}
        {before.payments.map((p) => (
          <TransferRow
            key={p.id}
            from={nameOf(p.fromId)}
            to={nameOf(p.toId)}
            amount={p.amount}
            muted
          />
        ))}
        {before.transfers.length > 0 && before.payments.length > 0 && (
          <p className='text-xs font-semibold text-muted-foreground'>
            Falta transferir
          </p>
        )}
        {before.transfers.map((t, index) => (
          <TransferRow
            key={`${t.fromId}-${t.toId}`}
            from={nameOf(t.fromId)}
            to={nameOf(t.toId)}
            amount={t.amount}
            style={{ transitionDelay: last ? `${index * 250}ms` : '0ms' }}
          />
        ))}
        {before.transfers.length === 0 && (
          <p className='rounded-xl bg-accent px-3 py-2 text-center text-sm font-semibold text-accent-foreground'>
            ¡Están al día!
          </p>
        )}
      </div>
    </div>
  );
}

function TransferRow({
  from,
  to,
  amount,
  muted,
  style,
}: {
  from: string;
  to: string;
  amount: number;
  muted?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      data-slot='transfer'
      style={style}
      className={cn(
        'flex min-h-9 items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-1 text-sm',
        muted && 'text-muted-foreground'
      )}
    >
      <span className='flex min-w-0 items-center gap-1.5 font-semibold break-words'>
        {from}
        <ArrowRight className='size-3.5 shrink-0' aria-hidden='true' />
        {to}
      </span>
      <span className='font-extrabold tabular-nums'>
        {formatAmount(amount)}
      </span>
    </div>
  );
}
