import { Skeleton } from '@/components/ui/skeleton';

/** Suspense fallback while a screen's chunk loads. */
export function PageFallback() {
  return (
    <div className='grid gap-3' role='status' aria-label='Cargando'>
      <Skeleton className='h-8 w-1/2' />
      <Skeleton className='h-24' />
      <Skeleton className='h-24' />
    </div>
  );
}
