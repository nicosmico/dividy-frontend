import { ChevronDown } from 'lucide-react';

import type { Question } from './questions';

/**
 * One expandable question (native `<details>`): the `id` lets
 * `/preguntas#<id>` point at it.
 */
export function FaqItem({ item }: { item: Question }) {
  return (
    <details
      id={item.id}
      className='group/faq scroll-mt-4 rounded-tile border bg-card text-card-foreground shadow-soft'
    >
      <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-tile px-4 py-3 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
        {item.question}
        <ChevronDown
          aria-hidden='true'
          className='size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-open/faq:rotate-180 motion-reduce:transition-none'
        />
      </summary>
      <div className='grid gap-3 px-4 pb-4 text-sm leading-relaxed text-muted-foreground'>
        {item.answer}
      </div>
    </details>
  );
}
