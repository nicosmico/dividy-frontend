import { lazy, Suspense, type ComponentProps } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

// The animation is its own chunk: it is only downloaded when a screen shows it.
const ExplanationPlayer = lazy(() =>
  import('./ExplanationPlayer').then((m) => ({ default: m.ExplanationPlayer }))
);

type Props = ComponentProps<typeof ExplanationPlayer>;

/** `ExplanationPlayer` loaded on demand, with a skeleton of similar height. */
export function LazyExplanationPlayer(props: Props) {
  return (
    <Suspense
      fallback={
        <div
          className={
            props.layout === 'page'
              ? 'flex-1 overflow-hidden p-4 md:p-6'
              : undefined
          }
        >
          <Skeleton
            aria-hidden='true'
            className='h-[40rem] max-h-full w-full rounded-card'
          />
        </div>
      }
    >
      <ExplanationPlayer {...props} />
    </Suspense>
  );
}
