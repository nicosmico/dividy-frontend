import { cn } from '@/lib/utils';

/**
 * Rounded square with the division sign rotated 45° (a diagonal line and two
 * dots). Navy square and mint symbol in light mode, inverted in dark mode:
 * both colors come from the `--logo-bg` and `--logo-fg` tokens.
 * `public/favicon.svg` is the same drawing with fixed colors.
 */
export function DividyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      aria-hidden='true'
      className={cn('size-8 shrink-0', className)}
    >
      <rect width='32' height='32' rx='9' className='fill-logo-bg' />
      <g transform='translate(16 16) scale(0.56) translate(-16 -16)'>
        <line
          x1='9'
          y1='23'
          x2='23'
          y2='9'
          strokeWidth='3.6'
          strokeLinecap='round'
          className='stroke-logo-fg'
        />
        <circle cx='10.5' cy='10.5' r='2.8' className='fill-logo-fg' />
        <circle cx='21.5' cy='21.5' r='2.8' className='fill-logo-fg' />
      </g>
    </svg>
  );
}
