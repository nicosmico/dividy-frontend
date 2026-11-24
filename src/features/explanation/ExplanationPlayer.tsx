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
import { computeMemberMoods } from '@/features/members';
import { formatAmount, type Group } from '@/domain';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  buildExplanation,
  buildLegend,
  type Explanation,
} from './build-explanation';
import { fillStyle } from './colors';
import { settleGroup } from './example-group';
import { narrate, STEP_COUNT, STEP_TITLES } from './narration';
import { PaidShareRow, type BarData } from './PaidShareRow';
import { buildShareSteps, type ShareStep } from './share-steps';

/** Step 2 ("Se calcula su parte") is the one that has sub-steps. */
const SHARE_STEP = 1;
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
 * `computeMemberMoods` for the faces. The rows are the same `PaidShareRow` the
 * Saldos chart draws, for any number of members. Step 2 goes through the
 * expenses one by one (`buildShareSteps`). CSS transitions only; with reduced
 * motion there is no autoplay and no transition, just the previous / next
 * buttons.
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
  const shareSteps = useMemo(() => buildShareSteps(before), [before]);
  // Every position of the animation: the 4 steps, with step 2 repeated once
  // per expense.
  const frames = useMemo(() => buildFrames(shareSteps.length), [shareSteps]);
  const [frame, setFrame] = useState(0);
  const { step, sub } = frames[frame];
  const [grown, setGrown] = useState(false);
  const [wantsPlay, setWantsPlay] = useState(true);
  const playing = wantsPlay && !reducedMotion;

  // The "Pagó" bars start empty and grow once the first frame is on screen.
  useEffect(() => {
    const id = window.setTimeout(() => setGrown(true), 60);
    return () => window.clearTimeout(id);
  }, []);

  // One timer per frame: moving by hand restarts the count. It does not run
  // while the tab is hidden.
  useEffect(() => {
    if (!playing || !visible) return;
    const id = window.setTimeout(
      () => setFrame((current) => (current + 1) % frames.length),
      STEP_MS
    );
    return () => window.clearTimeout(id);
  }, [playing, visible, frame, frames.length]);

  const go = (target: number) =>
    setFrame((target + frames.length) % frames.length);
  const last = step === STEP_COUNT - 1;
  const moods = last ? moodsAfter : moodsBefore;
  const scaleMax = Math.max(before.scaleMax, after.scaleMax, 1);
  const titleId = useId();
  const shareStep: ShareStep | undefined =
    step === SHARE_STEP ? shareSteps[sub] : undefined;
  const rows = useMemo(
    () =>
      buildRows({ before, after, settledAtEnd: settleAtEnd, step, shareStep }),
    [before, after, settleAtEnd, step, shareStep]
  );

  return (
    <section
      aria-label={label}
      className={cn('grid gap-3', className)}
      data-step={step}
      data-sub={step === SHARE_STEP ? sub : undefined}
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

      <div
        aria-hidden='true'
        data-slot='share-progress'
        className='flex h-4 items-center justify-between gap-2 text-xs font-semibold text-muted-foreground'
      >
        {step === SHARE_STEP && shareSteps.length > 0 && (
          <>
            <span>{shareProgressLabel(shareSteps, sub)}</span>
            <span className='flex gap-1'>
              {shareSteps.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'size-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none',
                    index <= sub ? 'bg-primary' : 'bg-border'
                  )}
                />
              ))}
            </span>
          </>
        )}
      </div>

      <ul aria-hidden='true' className='grid gap-4'>
        {before.members.map((m, index) => {
          const row = rows[index];
          return (
            <PaidShareRow
              key={m.member.id}
              member={m.member}
              mood={moods.get(m.member.id)}
              balance={row.balance}
              paid={row.paid}
              share={row.share}
              scaleMax={scaleMax}
              colors={before.colors}
              motion={{
                index,
                paidGrown: grown,
                focus: row.focus,
                split: row.split,
                shareShown: row.shareShown,
                shareAmountVisible: step >= SHARE_STEP,
                balanceVisible: step >= 2,
              }}
            />
          );
        })}
      </ul>

      <Footer step={step} before={before} />

      <p
        aria-live='polite'
        aria-atomic='true'
        className='min-h-[5lh] text-[0.9375rem] leading-relaxed'
      >
        <span className='sr-only'>
          Paso {step + 1} de {STEP_COUNT}: {STEP_TITLES[step]}.{' '}
          {step === SHARE_STEP && shareSteps.length > 0
            ? `${shareProgressLabel(shareSteps, sub)}. `
            : ''}
        </span>
        {narrate(before, step, settleAtEnd, shareStep)}
      </p>

      <div className='flex items-center justify-center gap-2'>
        <Button
          variant='outline'
          size='icon'
          aria-label='Paso anterior'
          onClick={() => go(frame - 1)}
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
          onClick={() => go(frame + 1)}
        >
          <ChevronRight className='size-5' aria-hidden='true' />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

interface Frame {
  step: number;
  /** Index of the expense being split (step 2 only). */
  sub: number;
}

/** The positions of the animation; step 2 has one per sub-step (at least one). */
function buildFrames(shareStepCount: number): Frame[] {
  const frames: Frame[] = [];
  for (let step = 0; step < STEP_COUNT; step++) {
    const count = step === SHARE_STEP ? Math.max(shareStepCount, 1) : 1;
    for (let sub = 0; sub < count; sub++) frames.push({ step, sub });
  }
  return frames;
}

function shareProgressLabel(steps: ShareStep[], sub: number): string {
  const step = steps[sub];
  return step.kind === 'rest'
    ? step.expenseIds.length === 1
      ? 'El otro gasto'
      : 'Los otros gastos'
    : `Gasto ${sub + 1} de ${steps.length}`;
}

interface RowState {
  balance: number;
  paid: BarData;
  share: BarData;
  focus: ReadonlySet<string> | null;
  split: { expenseId: string; amounts: number[] } | null;
  shareShown: ReadonlySet<string>;
}

/** What each row shows at a step (and sub-step); the same data as the chart. */
function buildRows({
  before,
  after,
  settledAtEnd,
  step,
  shareStep,
}: {
  before: Explanation;
  after: Explanation;
  settledAtEnd: boolean;
  step: number;
  shareStep?: ShareStep;
}): RowState[] {
  const last = step === STEP_COUNT - 1;
  const allIds = before.expenses.map((e) => e.id);
  const shareShown = new Set<string>(
    step === 0
      ? []
      : step === SHARE_STEP
        ? (shareStep?.revealedIds ?? [])
        : allIds
  );
  const focus = shareStep ? new Set(shareStep.expenseIds) : null;
  const focused =
    shareStep?.kind === 'expense'
      ? before.expenses.find((e) => e.id === shareStep.expenseIds[0])
      : undefined;
  const split = focused
    ? {
        expenseId: focused.id,
        amounts: focused.shares.map((share) => share.amount),
      }
    : null;

  return before.members.map((m, index) => {
    const settled = after.members[index];
    // The welcome example ends with the transfers paid: each "Pagó" bar
    // becomes what the member really put in, which is their share.
    const evened = last && settledAtEnd;
    const paid: BarData = evened
      ? { slices: settled.shareSlices, total: settled.share }
      : { slices: m.paidSlices, total: m.paid };
    const shownTotal = m.shareSlices
      .filter((slice) => shareShown.has(slice.expenseId))
      .reduce((sum, slice) => sum + slice.amount, 0);
    return {
      balance: last ? settled.balance : m.balance,
      paid,
      share: {
        slices: m.shareSlices,
        total: m.share,
        displayTotal: shownTotal,
      },
      focus,
      split,
      shareShown,
    };
  });
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
