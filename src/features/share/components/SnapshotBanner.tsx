import { Eye } from 'lucide-react';

import { formatDateTime } from '@/lib/dates';

/**
 * Fixed notice at the top of a snapshot (visible while scrolling): this is a
 * copy, it does not change. A labelled region (not a live `alert`: it is not
 * news, it is always there).
 */
export function SnapshotBanner({ takenAt }: { takenAt: string }) {
  return (
    <div className='sticky top-0 z-30 bg-background py-2'>
      <section
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
    </div>
  );
}
