import { Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/dates';

/**
 * Notice at the top of a snapshot: this is a copy, it does not change. A
 * labelled region (not a live `alert`: it is not news, it is always there).
 *
 * The full text takes about a fifth of a phone screen, so it is not sticky.
 * Once it scrolls out of view, a one-line bar ("Captura del … · solo
 * lectura") stays fixed at the top, so the reader always knows it is a
 * snapshot. The bar repeats the region, so screen readers skip it.
 */
export function SnapshotBanner({ takenAt }: { takenAt: string }) {
  const ref = useRef<HTMLElement>(null);
  const compact = useScrolledPast(ref);

  return (
    <>
      <section
        ref={ref}
        aria-label='Captura de solo lectura'
        className='flex items-start gap-2.5 rounded-card bg-accent p-3 text-sm leading-snug text-accent-foreground shadow-soft'
      >
        <Eye aria-hidden='true' className='mt-0.5 size-5 shrink-0' />
        <p>
          Captura del{' '}
          <time dateTime={takenAt} className='font-semibold'>
            {formatDateTime(takenAt)}
          </time>
          . Es solo para ver: los cambios que se hagan en el grupo original no
          aparecen aquí. Para ver una versión más nueva, pide que te compartan
          el link de nuevo.
        </p>
      </section>
      <div
        aria-hidden='true'
        data-testid='snapshot-compact-banner'
        className={cn(
          'fixed inset-x-0 top-0 z-30 bg-background transition-opacity duration-150 motion-reduce:transition-none',
          compact ? 'opacity-100' : 'invisible opacity-0'
        )}
      >
        <div className='mx-auto w-full max-w-lg px-4 py-2'>
          <p className='flex items-center gap-2 rounded-card bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow-soft'>
            <Eye className='size-4 shrink-0' />
            <span className='min-w-0 truncate'>
              Captura del {formatDateTime(takenAt)} · solo lectura
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

/** True once the element has scrolled out of view above the viewport. */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return past;
}
