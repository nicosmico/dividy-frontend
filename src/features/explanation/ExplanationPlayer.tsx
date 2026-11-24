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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
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
  /**
   * `card` (welcome): the card never changes height, so the legend and the
   * step 4 content share one reserved cell. `sheet` (the "Ver cómo se
   * calculó" dialog): the content scrolls and the narration and controls stay
   * pinned to the bottom of the dialog's scroll area; step 4 content only
   * exists from step 4 on.
   */
  layout?: PlayerLayout;
  className?: string;
}

export type PlayerLayout = 'card' | 'sheet';

/** Scrolling by hand within this time keeps the guided scroll still. */
const USER_SCROLL_GRACE_MS = 2000;
/** After opening, scrolls that are not the user's go back to the top. */
const OPEN_SETTLE_MS = 500;

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
  layout = 'card',
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

  const sheet = layout === 'sheet';
  const sectionRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const guide = useGuidedScroll({
    enabled: sheet,
    sectionRef,
    footerRef,
    reducedMotion,
  });
  const shown = useRef(false);
  useEffect(() => {
    // The first position is the one the sheet opens on: nothing to bring in.
    if (!sheet || !shown.current) {
      shown.current = true;
      return;
    }
    const involved = new Set<string>();
    const payers = new Set<string>();
    if (step === SHARE_STEP && shareStep) {
      for (const id of shareStep.expenseIds) {
        const expense = before.expenses.find((e) => e.id === id);
        if (!expense) continue;
        involved.add(expense.payerId);
        payers.add(expense.payerId);
        for (const share of expense.shares) involved.add(share.memberId);
      }
    }
    guide({
      step,
      payerIndexes: before.members.flatMap((m, index) =>
        payers.has(m.member.id) ? [index] : []
      ),
      rowIndexes: before.members.flatMap((m, index) =>
        involved.has(m.member.id) ? [index] : []
      ),
    });
    // Only a new position moves the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const top = (
    <>
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

      <Footer step={step} before={before} layout={layout} />
    </>
  );
  const narration = (
    <>
      <p
        aria-live='polite'
        aria-atomic='true'
        className={cn(
          'text-[0.9375rem] leading-relaxed',
          sheet ? 'min-h-[3lh]' : 'min-h-[5lh]'
        )}
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
    </>
  );

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className={cn(
        'grid gap-3',
        sheet &&
          'gap-0 [--sheet-pb:max(1rem,env(safe-area-inset-bottom))] [--sheet-px:1rem] md:[--sheet-pb:1.5rem] md:[--sheet-px:1.5rem]',
        className
      )}
      data-layout={layout}
      data-step={step}
      data-sub={step === SHARE_STEP ? sub : undefined}
    >
      {sheet ? (
        <>
          <div
            data-slot='player-body'
            className='grid gap-3 px-(--sheet-px) pb-4'
          >
            {top}
          </div>
          <div
            ref={footerRef}
            data-slot='player-footer'
            className='sticky bottom-0 z-10 grid gap-3 border-t border-border/60 bg-card px-(--sheet-px) pt-3 pb-(--sheet-pb)'
          >
            {narration}
          </div>
        </>
      ) : (
        <>
          {top}
          {narration}
        </>
      )}
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
 * payments already made and the transfers that are still missing. In the
 * `card` layout both live in the same grid cell so the card never changes
 * height; in the `sheet` layout only the one that applies exists.
 */
function Footer({
  step,
  before,
  layout,
}: {
  step: number;
  before: Explanation;
  layout: PlayerLayout;
}) {
  const last = step === STEP_COUNT - 1;
  const sheet = layout === 'sheet';
  const legend = buildLegend(before);
  const nameOf = (id: string) =>
    before.members.find((m) => m.member.id === id)?.member.name ?? 'alguien';
  const legendList = (
    <ul
      aria-hidden={last}
      data-slot='legend'
      className={cn(
        'flex flex-wrap content-start justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none',
        !sheet && last && 'invisible opacity-0'
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
  );
  const settling = (
    <div
      aria-hidden={!last}
      data-slot='settling'
      className={cn(
        'grid content-start gap-1.5 transition-opacity duration-500 motion-reduce:transition-none',
        !sheet && !last && 'invisible opacity-0'
      )}
    >
      {before.payments.length > 0 && (
        <div className='grid gap-1.5'>
          <p className='text-xs font-semibold text-muted-foreground'>
            Pagos ya registrados
          </p>
          {before.payments.map((p) => (
            <TransferRow
              key={p.id}
              from={nameOf(p.fromId)}
              to={nameOf(p.toId)}
              amount={p.amount}
              muted
            />
          ))}
        </div>
      )}
      <div data-slot='pending-transfers' className='grid gap-1.5'>
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
  if (sheet) return last ? settling : legendList;
  return (
    <div className='grid [&>*]:col-start-1 [&>*]:row-start-1'>
      {legendList}
      {settling}
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

/* ------------------------------------------------------------------ */

interface GuideTarget {
  step: number;
  /** Rows (by index) of the people involved in the current sub-step. */
  rowIndexes: number[];
  /** The ones among them who paid the expense(s) being split. */
  payerIndexes: number[];
}

/** Nearest ancestor that scrolls vertically (the dialog or sheet body). */
function findScroller(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return node;
  }
  return null;
}

/**
 * Scroll behavior of the `sheet` layout. Returns a function that, given the
 * new position of the animation, brings what changed into view inside the
 * dialog's scroll area, above the pinned footer: the step 4 transfers, or the
 * rows of the people in the current sub-step. It never moves the scroll while
 * the user scrolled in the last couple of seconds, and it does not animate
 * with reduced motion. On opening, the body always starts at the top.
 */
function useGuidedScroll({
  enabled,
  sectionRef,
  footerRef,
  reducedMotion,
}: {
  enabled: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  footerRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
}) {
  const lastUserScroll = useRef(-Infinity);
  // Set at the first move of the animation: from then on the scroll is ours.
  const started = useRef(false);

  useLayoutEffect(() => {
    const scroller = enabled ? findScroller(sectionRef.current) : null;
    if (!scroller) return;
    const openedAt = performance.now();
    scroller.scrollTop = 0;
    const touch = (event: Event) => {
      // Pressing the pinned buttons is not scrolling.
      if (
        event.target instanceof Node &&
        footerRef.current?.contains(event.target)
      )
        return;
      lastUserScroll.current = performance.now();
    };
    // Focus (or anything else) moving the body just after opening goes back.
    const settle = () => {
      if (
        !started.current &&
        performance.now() - openedAt < OPEN_SETTLE_MS &&
        lastUserScroll.current === -Infinity &&
        scroller.scrollTop !== 0
      )
        scroller.scrollTop = 0;
    };
    const events = ['wheel', 'touchstart', 'touchmove', 'pointerdown'] as const;
    for (const name of events)
      scroller.addEventListener(name, touch, { passive: true });
    scroller.addEventListener('scroll', settle, { passive: true });
    return () => {
      for (const name of events) scroller.removeEventListener(name, touch);
      scroller.removeEventListener('scroll', settle);
    };
  }, [enabled, sectionRef, footerRef]);

  return ({ step, rowIndexes, payerIndexes }: GuideTarget) => {
    started.current = true;
    const section = sectionRef.current;
    const scroller = enabled ? findScroller(section) : null;
    if (!section || !scroller || typeof scroller.scrollTo !== 'function')
      return;
    if (performance.now() - lastUserScroll.current < USER_SCROLL_GRACE_MS)
      return;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    if (step === 0) {
      // Back to the first step of the loop: show the first person again.
      if (scroller.scrollTop > 0) scroller.scrollTo({ top: 0, behavior });
      return;
    }
    const box = scroller.getBoundingClientRect();
    const viewTop = box.top;
    const viewBottom = Math.min(
      box.bottom,
      footerRef.current?.getBoundingClientRect().top ?? box.bottom
    );
    const gap = 8;
    const room = viewBottom - viewTop - 2 * gap;
    const rowRects = (indexes: number[]) => {
      const rows = section.querySelectorAll('[data-slot="paid-share-row"]');
      return indexes.flatMap((index) => {
        const row = rows[index];
        return row ? [row.getBoundingClientRect()] : [];
      });
    };
    let rects: DOMRect[] = [];
    if (step === STEP_COUNT - 1) {
      const target = section.querySelector('[data-slot="pending-transfers"]');
      if (target) rects = [target.getBoundingClientRect()];
    } else if (step === SHARE_STEP) {
      rects = rowRects(rowIndexes);
      const span = (list: DOMRect[]) =>
        Math.max(...list.map((r) => r.bottom)) -
        Math.min(...list.map((r) => r.top));
      // Not everybody fits: who paid is the one that must be on screen.
      if (rects.length > 0 && span(rects) > room) {
        const payers = rowRects(payerIndexes);
        if (payers.length > 0) rects = payers;
      }
    }
    if (rects.length === 0) return;
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    let delta = 0;
    if (bottom - top > room || top < viewTop + gap) delta = top - viewTop - gap;
    else if (bottom > viewBottom - gap) delta = bottom - viewBottom + gap;
    if (Math.abs(delta) > 1)
      scroller.scrollTo({ top: scroller.scrollTop + delta, behavior });
  };
}
