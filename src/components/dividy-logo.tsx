import { cn } from '@/lib/utils';

/** Zinc rounded square with the division sign rotated 45° in amber. */
export function DividyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      aria-hidden='true'
      className={cn('size-8 shrink-0', className)}
    >
      <rect width='24' height='24' rx='6' fill='#27272a' />
      <g
        transform='translate(12 12) rotate(45) scale(0.75) translate(-12 -12)'
        stroke='#fde68a'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M5 12h14' />
        <path d='M12 6m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
        <path d='M12 18m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
      </g>
    </svg>
  );
}
